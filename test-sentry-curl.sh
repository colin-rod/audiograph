#!/bin/bash

# Test the Sentry proxy endpoint
echo "Testing Sentry proxy..."

# Create a test envelope
ENVELOPE='{"event_id":"test123","sent_at":"2025-10-17T09:00:00.000Z"}
{"type":"event","content_type":"application/json"}
{"event_id":"test123","timestamp":"2025-10-17T09:00:00.000Z","level":"info","platform":"javascript","message":{"formatted":"Test message from curl"}}'

curl -X POST http://localhost:3000/api/sentry-proxy \
  -H "Content-Type: application/x-sentry-envelope" \
  -d "$ENVELOPE" \
  -v

echo -e "\n\nDone! Check the response above."
