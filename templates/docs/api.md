# API Template

## Structure

```markdown
# {project_name} - API Specification

> Generated: {generated_at} | Framework: {meta.framework} | Confidence: {confidence_summary.verified} verified, {confidence_summary.inferred} inferred, {confidence_summary.unknown} unknown

## Meta

| Property     | Value               |
| ------------ | ------------------- |
| Base URL     | `{base_url}`        |
| Content-Type | {meta.content_type} |
| Date Format  | {meta.date_format}  |

## Authentication

| Method                    | Header                    | Description                    |
| ------------------------- | ------------------------- | ------------------------------ |
| {authentication[].method} | {authentication[].header} | {authentication[].description} |

## Endpoints

### {endpoints[].resource}

#### {endpoints[].method} {endpoints[].path} [{endpoints[].confidence}]

**Description**: {endpoints[].description}

**Request** ({endpoints[].request.content_type}):

| Field                               | Type                                | Required                                |
| ----------------------------------- | ----------------------------------- | --------------------------------------- |
| {endpoints[].request.fields[].name} | {endpoints[].request.fields[].type} | {endpoints[].request.fields[].required} |

**Response**:

| Field                                | Type                                 |
| ------------------------------------ | ------------------------------------ |
| {endpoints[].response.fields[].name} | {endpoints[].response.fields[].type} |

**Status Codes**:

| Code                              | Description                              |
| --------------------------------- | ---------------------------------------- |
| {endpoints[].status_codes[].code} | {endpoints[].status_codes[].description} |

## Error Format

\`\`\`json
{error_format.structure}
\`\`\`

## Types

| Type           | Source                | Fields           | Description           |
| -------------- | --------------------- | ---------------- | --------------------- |
| {types[].name} | {types[].source_file} | {types[].fields} | {types[].description} |
```
