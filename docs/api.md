# REST API Reference

Base URL: `http://localhost:8080/api/v1`

**Auth header format:** `Authorization: Bearer <token>`

---

## Health Check

### `GET /health`
No auth required.

**Response `200`**
```json
{ "message": "alive", "status": 200 }
```

---

## Auth

### `POST /signup`
Create a new user account.

**Request body**
```json
{
  "username": "john_doe",
  "password": "secret123",
  "type": "user"          // "user" | "admin"
}
```

| Field | Type | Rules |
|---|---|---|
| `username` | string | Must be unique |
| `password` | string | min 3 characters |
| `type` | enum | `"user"` or `"admin"` |

**Response `201`**
```json
{ "userId": "uuid" }
```

**Errors**

| Code | Reason |
|---|---|
| `400` | Validation failed |
| `400` | Username already registered |

---

### `POST /signin`
Authenticate and receive a JWT.

**Request body**
```json
{
  "username": "john_doe",
  "password": "secret123"
}
```

**Response `200`**
```json
{ "token": "<jwt>" }
```

**Errors**

| Code | Reason |
|---|---|
| `400` | Validation error |
| `403` | User not registered |
| `401` | Wrong password |

---

## Public Catalog

### `GET /elements`
Returns all available world elements (tiles, objects).

**Response `200`**
```json
{
  "elements": [
    {
      "id": "uuid",
      "imageUrl": "https://...",
      "width": 1,
      "height": 1,
      "static": true
    }
  ]
}
```

---

### `GET /avatars`
Returns all available avatars.

**Response `200`**
```json
{
  "avatars": [
    {
      "id": "uuid",
      "imageUrl": "https://...",
      "name": "Warrior"
    }
  ]
}
```

---

## User

> All user routes require `Authorization: Bearer <token>`

### `POST /user/metadata`
Update the authenticated user's avatar.

**Request body**
```json
{ "avatarId": "uuid" }
```

**Response `200`**
```json
{ "message": "metadata is updated" }
```

**Errors**

| Code | Reason |
|---|---|
| `403` | Missing / invalid token |
| `400` | Avatar ID not found |

---

### `GET /user/metadata/bulk`
Fetch avatar info for multiple users (no auth required).

**Query params**

| Param | Format | Example |
|---|---|---|
| `ids` | `[id1,id2,id3]` | `?ids=[uuid1,uuid2]` |

**Response `200`**
```json
{
  "avatars": [
    { "userId": "uuid", "avatarId": "https://image-url" }
  ]
}
```

> `avatarId` in the response is actually the avatar's `imageUrl` string.

---

## Spaces

> All space routes require `Authorization: Bearer <token>`

### `POST /space`
Create a new space.

**Request body — empty space**
```json
{
  "name": "My Room",
  "dimensions": "100x200"
}
```

**Request body — from a map template**
```json
{
  "name": "Interview Room",
  "dimensions": "100x200",
  "mapId": "uuid"
}
```

| Field | Type | Rules |
|---|---|---|
| `name` | string | required |
| `dimensions` | string | `"HEIGHTxWIDTH"` format, up to 4 digits each |
| `mapId` | string | optional; if given, map's elements are copied into the space |

**Response `200`**
```json
{ "spaceId": "uuid" }
```

**Errors**

| Code | Reason |
|---|---|
| `400` | Validation error |
| `400` | Map not found |

---

### `GET /space/all`
List all spaces created by the authenticated user.

**Response `200`**
```json
{
  "spaces": [
    {
      "id": "uuid",
      "name": "My Room",
      "dimension": "100x200",
      "thumbnail": null
    }
  ]
}
```

---

### `GET /space/:spaceId`
Get a specific space including all placed elements.

> Only the space creator can access this endpoint.

**Response `200`**
```json
{
  "dimension": "100x200",
  "elements": [
    {
      "id": "spaceElementId",
      "element": {
        "id": "elementId",
        "imageUrl": "https://...",
        "height": 1,
        "width": 1,
        "static": true
      },
      "x": 20,
      "y": 30
    }
  ]
}
```

**Errors**

| Code | Reason |
|---|---|
| `400` | Space not found |
| `403` | Not the owner |

---

### `DELETE /space/:spaceId`
Delete a space and all its elements.

> Only the space creator can delete it.

**Response `200`**
```json
{ "message": "space deleted" }
```

**Errors**

| Code | Reason |
|---|---|
| `400` | Space not found |
| `403` | Not the owner |

---

### `POST /space/element`
Add an element into an existing space.

**Request body**
```json
{
  "spaceId": "uuid",
  "elementId": "uuid",
  "x": 10,
  "y": 20
}
```

| Field | Type | Rules |
|---|---|---|
| `spaceId` | string | Must be owned by the user |
| `elementId` | string | Must be a valid element |
| `x` | number | Must be within space width |
| `y` | number | Must be within space height |

**Response `200`**
```json
{ "message": "Element added" }
```

**Errors**

| Code | Reason |
|---|---|
| `400` | Validation error |
| `400` | Coordinates out of bounds |
| `400` | Invalid space |

---

### `DELETE /space/element`
Remove an element from a space.

**Request body**
```json
{ "id": "spaceElementId" }
```

**Response `200`**
```json
{ "message": "Successfully deleted" }
```

**Errors**

| Code | Reason |
|---|---|
| `403` | Element not found |
| `403` | Not the space owner |

---

## Admin

> All admin routes require `Authorization: Bearer <token>` with `role = Admin`

### `POST /admin/element`
Create a new world element.

**Request body**
```json
{
  "imageUrl": "https://...",
  "width": 1,
  "height": 1,
  "static": true
}
```

**Response `200`**
```json
{ "id": "uuid" }
```

---

### `PUT /admin/element/:elementId`
Update an element's image URL.

**Request body**
```json
{ "imageUrl": "https://new-image-url" }
```

**Response `200`**
```json
{ "message": "Element updated" }
```

**Errors**

| Code | Reason |
|---|---|
| `400` | elementId missing or not found |

---

### `POST /admin/avatar`
Create a new avatar.

**Request body**
```json
{
  "name": "Warrior",
  "imageUrl": "https://..."
}
```

**Response `200`**
```json
{ "avatarId": "uuid" }
```

---

### `POST /admin/map`
Create a new map template with preset elements.

**Request body**
```json
{
  "thumbnail": "https://...",
  "dimensions": "100x200",
  "name": "Conference Room",
  "defaultElements": [
    { "elementId": "uuid", "x": 10, "y": 20 },
    { "elementId": "uuid", "x": 15, "y": 20 }
  ]
}
```

**Response `200`**
```json
{ "id": "uuid" }
```

---

## Error Response Format

All error responses follow this structure:

```json
{ "message": "Human-readable error description" }
```

| HTTP Code | Meaning |
|---|---|
| `400` | Bad request / validation error |
| `401` | Invalid or expired token |
| `403` | Forbidden — missing token or insufficient role |
| `500` | Internal server error |
