# API Template

## Structure

```markdown
# <project_name> - API Specification

## Base URL

\`<base_url>\`

## Authentication

| Method | Header   | Description   |
| ------ | -------- | ------------- |
| <type> | <header> | <description> |

## Endpoints

### <resource>

#### <METHOD> <path>

**Description**: <description>

**Request**:
\`\`\`json
{
"<field>": "<type>"
}
\`\`\`

**Response**:
\`\`\`json
{
"<field>": "<type>"
}
\`\`\`

**Status Codes**:
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |

## Error Format

\`\`\`json
{
"error": {
"code": "<error_code>",
"message": "<message>"
}
}
\`\`\`

## Types

| Type        | Fields   | Description   |
| ----------- | -------- | ------------- |
| <type_name> | <fields> | <description> |
```

## Guidelines

| Section        | Description                                         |
| -------------- | --------------------------------------------------- |
| Base URL       | API base endpoint                                   |
| Authentication | Auth methods and headers                            |
| Endpoints      | Grouped by resource, with request/response examples |
| Error Format   | Standard error response structure                   |
| Types          | Shared data types and schemas                       |
