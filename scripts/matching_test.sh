#!/bin/bash
curl -X GET \
  'http://localhost:3000/matching?lat=37.281832&long=127.044339&userId=1' \
  -H 'cache-control: no-cache' \
  -H 'postman-token: 6c0c363e-45c9-ca11-6e15-ae555e6718e7'
