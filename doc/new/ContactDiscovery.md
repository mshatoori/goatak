I want to implement a new service called DnsServiceProxy. It is responsible for calling DnsService (which is an external service) and returning the results as an object (or list of objects).

The base URL for calling DnsService is `http://dns.api/`
Here's the swagger.json for DnsService:

```
{
  "openapi": "3.0.1",
  "info": {
    "title": "DNS API  Development",
    "version": "v1"
  },
  "paths": {
    "/Address": {
      "get": {
        "tags": [
          "DNS.API"
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      },
      "post": {
        "tags": [
          "DNS.API"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Address"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      },
      "put": {
        "tags": [
          "DNS.API"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Address"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/Address/urn/{urn}": {
      "get": {
        "tags": [
          "DNS.API"
        ],
        "parameters": [
          {
            "name": "urn",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer",
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/Address/Ip/{ip}": {
      "get": {
        "tags": [
          "DNS.API"
        ],
        "parameters": [
          {
            "name": "ip",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/Address/id/{id}": {
      "get": {
        "tags": [
          "DNS.API"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/Address/Import": {
      "post": {
        "tags": [
          "DNS.API"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/Address"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/Address/{id}": {
      "delete": {
        "tags": [
          "DNS.API"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/Address/DeleteAll": {
      "delete": {
        "tags": [
          "DNS.API"
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
  },
  "components": {
    "schemas": {
      "Address": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "nullable": true
          },
          "urn": {
            "type": "integer",
            "format": "int32",
            "nullable": true
          },
          "unitName": {
            "maxLength": 448,
            "minLength": 0,
            "type": "string",
            "nullable": true
          },
          "ipAddress": {
            "type": "string",
            "nullable": true
          },
          "description": {
            "type": "string",
            "nullable": true
          }
        },
        "additionalProperties": false
      }
    }
  }
}
```

We are only intrested in querying the DnsService, and won't call APIs that have side effects (ie. POST, PUT, DELETE), so don't need to implement those.
Keep it simple.
