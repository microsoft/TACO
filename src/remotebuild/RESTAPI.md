# REST API
### GET http://localhost:3000/certs/<PIN>
If PIN corresponds to a valid certificate and has not yet been used, then return the certificate file and invalidate the PIN. Otherwise returns a 404

### GET http://localhost:3000/modules/<packageName>
Find where a specified package services requests.
If the server configuration specified

    modules : {
    // [...]
      "packageName": "mountLocation"
    // [...]
    }

then the body of the response is the string mountLocation, and the Content-Location header is set to "http://localhost:3000/mountLocation"

If packageName was not specified in the config, then this request returns a 404.