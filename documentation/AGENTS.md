# AGENTS.md

## Project Structure
- Always use modular, maintainable app project structure for the respective language and web framework.

## Tech Stack Rules
- **React**: You are building a React application using TypeScript.
- **Routing**: Use React Router. KEEP routes in `src/App.tsx`.
- **Structure**:
    - Source code in `src/`.
    - Pages in `src/pages/`.
    - Components in `src/components/`.
    - Main page is `src/pages/Index.tsx`.
- **UI Library**: ALWAYS try to use `shadcn/ui`.
- **Styling**: ALWAYS use Tailwind CSS.
- **Icons**: Use `lucide-react`.

## Development Process
- **Mobile-First Design**: The project constitution mandates a mobile-first portfolio website. All designs must prioritize mobile viewports before scaling up to desktop.
- Always check if a feature works before moving on to the next feature (i.e., do incremental development or agile workflow).
- Add or update changes to `README.md` file to the root of the project.
- Update documentation in the `documentation/` folder at the root of the project.

## Coding Style
- **General**:
    - Use descriptive variable, function, class names that are self-explanatory.
    - Use descriptive docstrings for functions and classes.
    - Use descriptive comments for code that is not self-explanatory.
    - For core business logic ensure to add multi-line comments to explain how the code implements the logic.
- **TypeScript/JavaScript**:
    - Use `camelCase` for variable and function names.
    - Use `PascalCase` for class names and components.
    - Use Prettier/ESLint for formatting.

## Boundaries
- **Always**:
    - Write to `src/` or similar and `tests/`.
    - Run tests before commits.
    - Follow naming conventions.
    - Use secure coding practices (OWASP Top 10).
- **Access Control**:
    - The project constitution dictates safe and secure edit access restricted exclusively to one single admin. NEVER introduce multi-user edit capabilities or roles beyond the single admin.
- **Ask if**:
    - Database schema changes.
    - Adding dependencies.
    - Modifying CI/CD config.
    - Architecture/Design changes.
- **Never**:
    - Commit secrets or API keys.
    - Push broken code to the main branch.
    - Commit code that does not work.

## Security
- **Single Admin Enforcement**: Ensure edit access to portfolio, CV match maker, blog, photography, and travelogue sections is rigorously protected and accessible only to the single admin.
- Validate all inputs.
- Use parameterized queries to prevent SQL injection (if applicable).
- Sanitize output to prevent XSS.
- Implement proper authentication and authorization.
- Handle errors gracefully without leaking sensitive information.

## Performance
- Optimize database queries.
- Minimize network requests.
- Use efficient algorithms and data structures.
- Lazy load resources where appropriate.

## Testing
- Write unit tests for all new logic.
- Write integration tests for API endpoints.
- Ensure high code coverage.
- Run tests automatically in CI/CD.

## Deployment
- Use automated deployment pipelines.
- Use environment variables for configuration.

## Maintenance
- Keep dependencies up to date.
- Refactor code regularly to reduce technical debt.
- Monitor application logs and performance metrics.

## Future Proofing
- Design for scalability.
- Use standard interfaces and protocols.
- Avoid vendor lock-in where possible.

## Sub-agents
- Use specialized sub-agents for specific tasks (e.g., DB design, Frontend, Backend).
- Define clear interfaces and contracts between agents using OpenAPI specs.
- Ensure that sub-agents follow the same boundaries and guidelines as the main agent.

## Documentation
- Keep `README.md` up to date.
- Document API endpoints (OpenAPI/Swagger) as enforceable contracts.
- Document complex logic and algorithms.
