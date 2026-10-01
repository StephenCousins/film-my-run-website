# Shoe Finder: Jev vs google/gemini-2.5-flash-lite

Run once on 1 Oct 2026 by a throwaway script (removed after; Jev stayed out of the Shoe Finder). The three "wrong yeses" are not model errors: the catalogue holds the same shoe twice, as "New Balance Ellipse" and "New Balance Ellipse v1".

Date: 2026-10-01. 174 review pages fetched from 217 sampled. Jev cost $0.0089.

## Score from the opening of a review (57 pages whose own score is hidden from the excerpt)

- Chat model: 57/57 answered, mean error 1.07, within 1 point 63%
- Jev: 57/57 answered, mean error 1.30, within 1 point 56%

## Is this a review of exactly this shoe? (342 cases)

| | right yes | wrong no | **wrong yes** | right no | no answer |
|---|---|---|---|---|---|
| Chat model | 173 | 1 | **3** | 165 | 0 |
| Jev at 0.5 | 168 | 6 | **3** | 164 | 1 |
| Jev at 0.7 | 167 | 7 | **3** | 164 | 1 |
| Jev at 0.9 | 162 | 12 | **2** | 165 | 1 |

## Wrong yeses (either model)

| asked about | page | chat | Jev |
|---|---|---|---|
| New Balance Ellipse | New Balance Ellipse v1 Review (2026) - Doctors of Running | YES | 0.96 |
| New Balance Ellipse | New Balance Ellipse Review - RTINGS.com | YES | 0.94 |
| New Balance Ellipse v1 | New Balance Ellipse Review: The Verdict - The Run Testers | YES | 0.82 |
