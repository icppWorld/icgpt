# Custom Domain `icgpt.onicai.com`

[IC Custom Domain Docs](https://internetcomputer.org/docs/current/developer-docs/production/custom-domain/#custom-domains-on-the-boundary-nodes)

One time steps to use the custom domain `icgpt.onicai.com` :

1. Define the DNS records as described in step 1 of [IC Custom Domain Docs](https://internetcomputer.org/docs/current/developer-docs/production/custom-domain/#custom-domains-on-the-boundary-nodes)

   You can verify everything is propagating with "dig":

   ```
   % dig CNAME icgpt.onicai.com
   ;; ANSWER SECTION:
   icgpt.onicai.com.     3600    IN      CNAME   icp1.io.

   % dig CNAME _acme-challenge.icgpt.onicai.com
   ;; ANSWER SECTION:
   _acme-challenge.icgpt.onicai.com. 3600 IN CNAME _acme-challenge.icgpt.onicai.com.icp2.io.

   % dig TXT _canister-id.icgpt.onicai.com
   ;; ANSWER SECTION:
   _canister-id.icgpt.onicai.com. 3600 IN TXT    "4v3v2-lyaaa-aaaag-abzna-cai"
   ```

2. Created this file `src/frontend/domain-info/.well-known/ic-domains`:

```
icgpt.onicai.com
icgpt.icpp.world
```

Notes:

- we will keep both domains active for now
- Instead of a file `domain-info/.ic-assets.json` as explained in the docs, I added this content to `src/frontend/src/.ic-assets.json5`:

```json
{
  "match": ".well-known",
  "ignore": false
},
```

Note that the name `domain-info` is something I chose.

3. Updated the `CopyPlugin` of `webpack.config.js` to copy these files into the `dist/frontend` folder during build.

4. Deploy & verify that files are included in `dist/frontend` during build:

```bash
# First deploy these local, so all bindings are created
dfx start --clean
dfx deploy internet_identity
dfx deploy canister_frontend

# Then deploy to ic
dfx deploy --ic canister_frontend

```

5. Initiate the registration of domain with IC this command & check that the output looks similar as:

```bash
$ curl -sLv -X POST \
    -H 'Content-Type: application/json' \
    https://ic0.app/registrations \
    --data @- <<EOF
{
    "name": "icgpt.onicai.com"
}
EOF

...
* Connection #0 to host ic0.app left intact
{"id":"xxx..."}
```

6. Query the status, using the REQUEST_ID:
   (You might need to repeat this several times before everything is 'approved')

```bash
$ curl -sLv -X GET \
    https://ic0.app/registrations/xxx
...
# once approved
* Connection #0 to host ic0.app left intact
{"name":"icgpt.onicai.com","canister":"4v3v2-lyaaa-aaaag-abzna-cai","state":"Available"}
```
