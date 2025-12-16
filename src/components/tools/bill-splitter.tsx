"use client";

import * as React from "react";
import { Calculator, Share2, Users, Download, Plus, Minus, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatIBAN, validateIBAN } from "@/features/transactions/import/detect-iban";
import { formatTRY } from "@/lib/money";
import { HiddenReceipt } from "./hidden-receipt";
import { toPng } from "html-to-image";

const IBAN_STORAGE_KEY = "unicebim:bill-splitter:iban";

type Person = {
  id: string;
  name: string;
  amount: number;
};

type TipPercentage = 0 | 10 | 20;

export function BillSplitter() {
  const [activeTab, setActiveTab] = React.useState<"equal" | "itemized">("equal");
  
  // Equal split state
  const [totalAmount, setTotalAmount] = React.useState<string>("");
  const [personCount, setPersonCount] = React.useState<number>(2);
  const [tipPercentage, setTipPercentage] = React.useState<TipPercentage>(0);
  
  // Itemized split state
  const [people, setPeople] = React.useState<Person[]>([
    { id: "1", name: "", amount: 0 },
  ]);
  const [itemizedTipPercentage, setItemizedTipPercentage] = React.useState<TipPercentage>(0);
  
  // Common state
  const [iban, setIban] = React.useState<string>("");
  const [ibanError, setIbanError] = React.useState<string>("");
  
  const receiptRef = React.useRef<HTMLDivElement>(null);

  // Load IBAN from localStorage on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const storedIban = localStorage.getItem(IBAN_STORAGE_KEY);
      if (storedIban) {
        setIban(storedIban);
      }
    }
  }, []);

  // Save IBAN to localStorage when it changes
  const handleIbanChange = React.useCallback((value: string) => {
    setIban(value);
    setIbanError("");
    
    if (value.trim() && typeof window !== "undefined") {
      if (validateIBAN(value)) {
        localStorage.setItem(IBAN_STORAGE_KEY, value);
      } else {
        setIbanError("Geçersiz IBAN formatı. Türk IBAN formatı bekleniyor (TR ile başlayan 26 karakter).");
      }
    } else if (typeof window !== "undefined") {
      localStorage.removeItem(IBAN_STORAGE_KEY);
    }
  }, []);

  // Equal split calculations
  const equalSplitTotal = React.useMemo(() => {
    const amount = parseFloat(totalAmount) || 0;
    const tip = amount * (tipPercentage / 100);
    return amount + tip;
  }, [totalAmount, tipPercentage]);

  const perPersonAmount = React.useMemo(() => {
    if (personCount <= 0) return 0;
    return equalSplitTotal / personCount;
  }, [equalSplitTotal, personCount]);

  // Itemized split calculations
  const itemizedSubtotal = React.useMemo(() => {
    return people.reduce((sum, person) => sum + (parseFloat(String(person.amount)) || 0), 0);
  }, [people]);

  const itemizedTip = React.useMemo(() => {
    return itemizedSubtotal * (itemizedTipPercentage / 100);
  }, [itemizedSubtotal, itemizedTipPercentage]);

  const itemizedTotal = React.useMemo(() => {
    return itemizedSubtotal + itemizedTip;
  }, [itemizedSubtotal, itemizedTip]);

  // Person management
  const handleAddPerson = React.useCallback(() => {
    setPeople((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", amount: 0 },
    ]);
  }, []);

  const handleRemovePerson = React.useCallback((id: string) => {
    setPeople((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const handleUpdatePerson = React.useCallback((id: string, field: "name" | "amount", value: string | number) => {
    setPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  }, []);

  // WhatsApp sharing
  const generateWhatsAppMessage = React.useCallback((mode: "equal" | "itemized") => {
    let message = "Gençler hesap belli oldu!\n\n";
    
    if (mode === "equal") {
      message += `Toplam: ${formatTRY(equalSplitTotal)}\n`;
      message += `Kişi Başı: ${formatTRY(perPersonAmount)}\n`;
    } else {
      message += `Toplam: ${formatTRY(itemizedTotal)}\n\n`;
      people.forEach((person) => {
        const amount = parseFloat(String(person.amount)) || 0;
        const personTip = amount * (itemizedTipPercentage / 100);
        const personTotal = amount + personTip;
        if (person.name.trim()) {
          message += `${person.name}: ${formatTRY(personTotal)}\n`;
        }
      });
    }
    
    message += "\n";
    
    if (iban.trim() && validateIBAN(iban)) {
      message += `IBAN: ${formatIBAN(iban)}\n\n`;
    }
    
    message += "(UniCebim ile hesaplandı)";
    
    return message;
  }, [equalSplitTotal, perPersonAmount, itemizedTotal, itemizedTipPercentage, people, iban]);

  const handleShareWhatsApp = React.useCallback((mode: "equal" | "itemized") => {
    const message = generateWhatsAppMessage(mode);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  }, [generateWhatsAppMessage]);

  // Receipt download
  const handleDownloadReceipt = React.useCallback(async () => {
    if (!receiptRef.current) {
      return;
    }

    try {
      const element = receiptRef.current;
      
      // Store original styles
      const originalStyles = {
        visibility: element.style.visibility,
        position: element.style.position,
        left: element.style.left,
        top: element.style.top,
        zIndex: element.style.zIndex,
      };
      
      // Make it visible but positioned off-screen for capture
      element.style.visibility = "visible";
      element.style.position = "fixed";
      element.style.left = "0px";
      element.style.top = "0px";
      element.style.zIndex = "9999";
      element.style.opacity = "1";

      // Wait for rendering
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Calculate proper dimensions
      const rect = element.getBoundingClientRect();
      const height = element.scrollHeight || rect.height;

      const dataUrl = await toPng(element, {
        backgroundColor: "#f5f5f5",
        quality: 1.0,
        pixelRatio: 2,
        width: 400,
        height: height,
        cacheBust: true,
        style: {
          transform: "scale(1)",
        },
      });

      // Restore original styles
      element.style.visibility = originalStyles.visibility || "hidden";
      element.style.position = originalStyles.position || "absolute";
      element.style.left = originalStyles.left || "-9999px";
      element.style.top = originalStyles.top || "0px";
      if (originalStyles.zIndex) {
        element.style.zIndex = originalStyles.zIndex;
      } else {
        element.style.removeProperty("z-index");
      }

      // Download the image
      const link = document.createElement("a");
      const date = new Date().toISOString().split("T")[0]!;
      link.download = `hesap-ozeti-${date}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Receipt download failed:", error);
      // Ensure element is hidden even on error
      if (receiptRef.current) {
        receiptRef.current.style.visibility = "hidden";
        receiptRef.current.style.left = "-9999px";
      }
    }
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Hesap Bölüştürücü</h1>
        <p className="text-muted-foreground">
          Restoran hesabını kolayca bölüştürün ve paylaşın
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "equal" | "itemized")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="equal" className="flex items-center gap-2">
            <Calculator className="size-4" />
            Eşit Böl
          </TabsTrigger>
          <TabsTrigger value="itemized" className="flex items-center gap-2">
            <Users className="size-4" />
            Kim Ne Yedi?
          </TabsTrigger>
        </TabsList>

        {/* Equal Split Tab */}
        <TabsContent value="equal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Eşit Böl</CardTitle>
              <CardDescription>
                Toplam tutarı eşit olarak bölüştürün
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="total-amount">Toplam Tutar (TL)</Label>
                <Input
                  id="total-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Kişi Sayısı</Label>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPersonCount((prev) => Math.max(1, prev - 1))}
                    disabled={personCount <= 1}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center text-lg font-semibold">
                    {personCount}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPersonCount((prev) => prev + 1)}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bahşiş/Servis Oranı</Label>
                <div className="flex gap-2">
                  {([0, 10, 20] as TipPercentage[]).map((tip) => (
                    <Button
                      key={tip}
                      variant={tipPercentage === tip ? "default" : "outline"}
                      onClick={() => setTipPercentage(tip)}
                      className="flex-1"
                    >
                      %{tip}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2 rounded-lg bg-muted p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Toplam:</span>
                  <span className="font-semibold">{formatTRY(equalSplitTotal)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Kişi Başı:</span>
                  <span className="font-bold text-primary">
                    {formatTRY(perPersonAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Itemized Split Tab */}
        <TabsContent value="itemized" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kim Ne Yedi?</CardTitle>
              <CardDescription>
                Her kişinin yediği tutarı ayrı ayrı girin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {people.map((person, index) => (
                  <div key={person.id} className="space-y-2 rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor={`person-name-${person.id}`}>
                          Kişi {index + 1}
                        </Label>
                        <Input
                          id={`person-name-${person.id}`}
                          placeholder="İsim (örn: Ahmet)"
                          value={person.name}
                          onChange={(e) =>
                            handleUpdatePerson(person.id, "name", e.target.value)
                          }
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label htmlFor={`person-amount-${person.id}`}>Tutar (TL)</Label>
                        <Input
                          id={`person-amount-${person.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={person.amount || ""}
                          onChange={(e) =>
                            handleUpdatePerson(
                              person.id,
                              "amount",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                      {people.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePerson(person.id)}
                          className="mt-8"
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={handleAddPerson}
                className="w-full"
              >
                <Plus className="mr-2 size-4" />
                Kişi Ekle
              </Button>

              <div className="space-y-2">
                <Label>Bahşiş/Servis Oranı</Label>
                <div className="flex gap-2">
                  {([0, 10, 20] as TipPercentage[]).map((tip) => (
                    <Button
                      key={tip}
                      variant={itemizedTipPercentage === tip ? "default" : "outline"}
                      onClick={() => setItemizedTipPercentage(tip)}
                      className="flex-1"
                    >
                      %{tip}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2 rounded-lg bg-muted p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ara Toplam:</span>
                  <span className="font-semibold">{formatTRY(itemizedSubtotal)}</span>
                </div>
                {itemizedTipPercentage > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Bahşiş (%{itemizedTipPercentage}):
                    </span>
                    <span className="font-semibold">{formatTRY(itemizedTip)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Toplam:</span>
                  <span className="font-bold text-primary">
                    {formatTRY(itemizedTotal)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Common Section: IBAN and Share */}
      <Card>
        <CardHeader>
          <CardTitle>IBAN & Paylaş</CardTitle>
          <CardDescription>
            IBAN bilginizi girin ve hesabı paylaşın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="iban">IBAN&apos;ım</Label>
            <Input
              id="iban"
              placeholder="TR33 0006 1005 1978 6457 8413 26"
              value={iban}
              onChange={(e) => handleIbanChange(e.target.value)}
            />
            {ibanError && (
              <p className="text-sm text-destructive">{ibanError}</p>
            )}
            {iban && validateIBAN(iban) && (
              <p className="text-sm text-muted-foreground">
                Formatlanmış: {formatIBAN(iban)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => handleShareWhatsApp(activeTab)}
              className="flex-1 bg-[#25D366] hover:bg-[#20BA5A]"
              size="lg"
            >
              <Share2 className="mr-2 size-4" />
              WhatsApp&apos;ta Paylaş
            </Button>
            {activeTab === "itemized" && (
              <Button
                onClick={handleDownloadReceipt}
                variant="outline"
                size="lg"
                className="flex-1"
                disabled={
                  people.filter((p) => p.name.trim() || parseFloat(String(p.amount)) > 0)
                    .length === 0 || itemizedTotal <= 0
                }
              >
                <Download className="mr-2 size-4" />
                Fiş Olarak İndir
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hidden Receipt Component for Image Generation */}
      {activeTab === "itemized" && (
        <HiddenReceipt
          ref={receiptRef}
          people={people}
          subtotal={itemizedSubtotal}
          tip={itemizedTip}
          tipPercentage={itemizedTipPercentage}
          total={itemizedTotal}
          iban={iban}
        />
      )}
    </div>
  );
}

