# API Template

## Structure

```markdown
# {project_name} - API Specification

## Base URL

\`{base_url}\`

## Authentication

| Method                    | Header                    | Description                    |
| ------------------------- | ------------------------- | ------------------------------ |
| {authentication[].method} | {authentication[].header} | {authentication[].description} |

## Endpoints

### {endpoints[].resource}

#### {endpoints[].method} {endpoints[].path}

**Description**: {endpoints[].description}

**Request**:
\`\`\`json
{endpoints[].request.fields}
\`\`\`

**Response**:
\`\`\`json
{endpoints[].response.fields}
\`\`\`

**Status Codes**:

| Code                              | Description                              |
| --------------------------------- | ---------------------------------------- |
| {endpoints[].status_codes[].code} | {endpoints[].status_codes[].description} |

## Error Format

\`\`\`json
{error_format.structure}
\`\`\`

## Types

| Type           | Fields           | Description           |
| -------------- | ---------------- | --------------------- |
| {types[].name} | {types[].fields} | {types[].description} |
```
