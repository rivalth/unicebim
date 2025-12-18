# Contributing to UniCebim

Thank you for your interest in UniCebim! We welcome contributions from the community to help make this budget tracker even better for university students.

## How to Contribute

### 1. Reporting Bugs
- Check the [Issues](https://github.com/rivalth/unicebim/issues) to see if the bug has already been reported.
- If not, create a new issue using the **Bug Report** template.
- Provide as much detail as possible, including steps to reproduce the bug.

### 2. Suggesting Features
- Check the [Issues](https://github.com/rivalth/unicebim/issues) to see if the feature has already been proposed.
- If not, create a new issue using the **Feature Request** template.
- Explain the benefit of the feature and how it should work.

### 3. Pull Requests
- Fork the repository.
- Create a new branch for your changes: `git checkout -b feature/your-feature-name` or `bugfix/your-bug-name`.
- Make your changes and ensure they follow the [Coding Standards](#coding-standards).
- Write tests for your changes if applicable.
- Ensure all tests pass: `yarn test:run`.
- Commit your changes with a descriptive message.
- Push to your fork and submit a pull request to the `main` branch.

## Development Setup

1.  **Clone the repo**:
    ```bash
    git clone https://github.com/rivalth/unicebim.git
    cd unicebim
    ```

2.  **Install dependencies**:
    ```bash
    yarn
    ```

3.  **Environment Variables**:
    ```bash
    cp env.example .env.local
    ```
    Fill in your Supabase credentials (URL and Anon Key).

4.  **Database Setup**:
    - Follow the instructions in `docs/supabase.sql` to set up your Supabase project.

5.  **Run development server**:
    ```bash
    yarn dev
    ```

## Coding Standards

- **TypeScript**: Use TypeScript for all new code. Ensure types are properly defined.
- **Styling**: Use Tailwind CSS for styling. Follow the existing UI patterns.
- **Components**: Use the components in `src/components/ui` (shadcn/ui) whenever possible.
- **Linting**: Ensure your code passes linting: `yarn lint`.
- **Formatting**: We use ESLint and Prettier (via ESLint) for formatting.

## License

By contributing to UniCebim, you agree that your contributions will be licensed under the MIT License.

