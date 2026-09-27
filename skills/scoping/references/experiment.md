# Unknowns an observation can resolve

Choose an experiment, prototype, or reproduction only when existing material, code, logs, and tests cannot settle it, and the result would change the direction. Before observing, fix what you want to decide and the results that tell the hypotheses apart. Do not conclude from "it worked" alone.

Keep the minimum prototype the question needs apart from production code. Record the target version, environment, input, and the limits of application. When concurrency, interruption, external state, or persistence is the question, choose conditions that can observe it. Do not generalize success against a mock response or in memory into a guarantee about the real system.

Do not run unauthorized external operations or write to production. When the question cannot be answered within the permitted scope, show that limit and the decision it needs.

Stop once the evidence suffices for the decision. When results cannot be told apart, or no new evidence comes, leave the unconfirmed items and the next investigation or decision needed.

Reflect the conclusion, evidence, and limits of application in the Issue draft, and keep only reusable evidence in docs/research/ per session.md § Saving and revising. Do not treat a successful prototype as completion of the real implementation or its adoption; return to the procedure in issue.md.
