/**
 * Test-only signing chain for StoreKit proofs: a throwaway root → intermediate
 * → leaf (generated 1 Oct 2026 with openssl, valid 2020–2056) carrying Apple's
 * StoreKit OIDs, so tests can sign JWS the real verifier accepts. The key is
 * NOT a secret; nothing outside vitest trusts this root.
 */
import { createPrivateKey, sign } from 'node:crypto';
import { trustTestRoot } from './pro';

const ROOT = `-----BEGIN CERTIFICATE-----
MIIBlTCCAT2gAwIBAgIUOIn9BAcF8EQPdNb3WDViHJVP8eowCgYIKoZIzj0EAwIw
GDEWMBQGA1UEAwwNRk1SIFRlc3QgUm9vdDAgFw0yMDAxMDEwMDAwMDBaGA8yMDU2
MDEwMTAwMDAwMFowGDEWMBQGA1UEAwwNRk1SIFRlc3QgUm9vdDBZMBMGByqGSM49
AgEGCCqGSM49AwEHA0IABBtMR/dzUKZ5cloRayFj6j9abePDnh4SlZRldzhF50hd
jmKMZ9q6po9GGlUJT0y+JlRc6QD5me7Jxzvk6/SIJuyjYzBhMB0GA1UdDgQWBBR9
jucPEjT9khvFeJzZR7Rlqiag/TAfBgNVHSMEGDAWgBR9jucPEjT9khvFeJzZR7Rl
qiag/TAPBgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBBjAKBggqhkjOPQQD
AgNGADBDAiBD/tSOyJ0jayR34+/JpHxG5q3GvKj+fIY+YDE7XqRKcAIfQvjZqUrZ
Yh4+2TX9WpUAO9uB/oyPGfyHh4DpkQDOag==
-----END CERTIFICATE-----`;
const INTERMEDIATE = `-----BEGIN CERTIFICATE-----
MIIBtTCCAVqgAwIBAgIUNjhbX1z/RXLSjywUP/XPOHU0QnUwCgYIKoZIzj0EAwIw
GDEWMBQGA1UEAwwNRk1SIFRlc3QgUm9vdDAgFw0yMDAxMDEwMDAwMDBaGA8yMDU2
MDEwMTAwMDAwMFowIDEeMBwGA1UEAwwVRk1SIFRlc3QgSW50ZXJtZWRpYXRlMFkw
EwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEjZaoUnlREbFsTg7ikTIB6h8qgOKGKYVR
FLwIKLsFZ5F6358Ux0UsDnoO6Mkwt28iqc19El7F27SALG+IGiwm7qN4MHYwEgYD
VR0TAQH/BAgwBgEB/wIBADAOBgNVHQ8BAf8EBAMCAQYwEAYKKoZIhvdjZAYCAQQC
BQAwHQYDVR0OBBYEFIGepdLhCdjkRogjjCbtPuNjGCUxMB8GA1UdIwQYMBaAFH2O
5w8SNP2SG8V4nNlHtGWqJqD9MAoGCCqGSM49BAMCA0kAMEYCIQC56NTNjvIgKY62
pUQQaEEQonw3P7KFBjDywbCwzae8cwIhAK00AH55lbZhzNbc+znqOaZnWNulbzR1
mIUdeBeCXQgk
-----END CERTIFICATE-----`;
const LEAF = `-----BEGIN CERTIFICATE-----
MIIBrjCCAVSgAwIBAgIUYTl8y48xMV64eLg3lFQed9N7VZkwCgYIKoZIzj0EAwIw
IDEeMBwGA1UEAwwVRk1SIFRlc3QgSW50ZXJtZWRpYXRlMCAXDTIwMDEwMTAwMDAw
MFoYDzIwNTYwMTAxMDAwMDAwWjAYMRYwFAYDVQQDDA1GTVIgVGVzdCBMZWFmMFkw
EwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEaSncQL/VhRyPZe3+H3l+8UVXGm7ZH1mf
9Zij5ATuGRaS68CPOm3K6Ade03QIVUmLmuenLu+oQkaezG2XaFFPWqNyMHAwDAYD
VR0TAQH/BAIwADAOBgNVHQ8BAf8EBAMCB4AwEAYKKoZIhvdjZAYLAQQCBQAwHQYD
VR0OBBYEFFKy8zt22UbhLJb+TIU52TiRjPs/MB8GA1UdIwQYMBaAFIGepdLhCdjk
RogjjCbtPuNjGCUxMAoGCCqGSM49BAMCA0gAMEUCIBT+OG8EOxCaWk/ftoPSp8+S
qsfefTpPD4jX5j/82rrcAiEAiiGLqzjZ23UpRKpykrXB1faTRT/2p1MBn7cxykgp
QTQ=
-----END CERTIFICATE-----`;
const LEAF_KEY = createPrivateKey(`-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgfjOSE/NeFqNY8aEM
O8jTOPV+rfaxTzajNeNaqwzeqmChRANCAARpKdxAv9WFHI9l7f4feX7xRVcabtkf
WZ/1mKPkBO4ZFpLrwI86bcroB17TdAhVSYua56cu76hCRp7MbZdoUU9a
-----END PRIVATE KEY-----`);

trustTestRoot(ROOT);

const der = (pem: string) => pem.replace(/-----[^-]+-----|\s/g, '');
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

/** A StoreKit-shaped JWS with this payload, signed by the test chain. */
export function encodeTestJws(payload: Record<string, unknown>, chain: string[] = [LEAF, INTERMEDIATE, ROOT]): string {
  const signingInput = `${b64({ alg: 'ES256', x5c: chain.map(der) })}.${b64(payload)}`;
  return `${signingInput}.${sign('sha256', Buffer.from(signingInput), { key: LEAF_KEY, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}

export const testChain = { ROOT, INTERMEDIATE, LEAF };
