# Data status and evidence discipline

Every value used in this project is labelled with one of:

- **SOURCE** — directly supported by the supplied PDFs or an official current
  source.
- **INFERENCE** — a reasoned interpretation of source facts.
- **PROPOSED** — a project assumption, illustrative pilot value, UX choice, or
  model parameter that must be calibrated later.

## SOURCE-derived facts (from the supplied research)

- Post-harvest losses across 54 commodities are valued at roughly
  **₹1.53 lakh crore per year** for the 2020–22 reference period
  (NABCONS/MoFPI estimate). This covers multiple stages, not cold storage alone.
- Official baseline of **8,815 cold-storage facilities** and
  **40.22 million MT installed capacity** as of **30 June 2025**. Installed
  capacity is not the same as affordable, nearby, multi-commodity access for a
  small processor.
- Approximately **24.59 lakh unregistered food-processing enterprises**
  (NSS 73rd Round, **2015–16**), close to 98% of enterprises by number, with
  ~66% rural and ~80% family-based. Always show the survey year.
- Support pathways discussed in the research: **PMFME**, **PMKSY Integrated Cold
  Chain**, and **MSE-CDP**. Scheme limits, dates, and eligibility must be
  verified against current official guidance before being presented as an active
  application route.

## PROPOSED values in this prototype

Everything numeric in `src/data/scenarios.json` is **PROPOSED** and illustrative,
including but not limited to:

- All per-scenario state values (good/spoiled/rejected quantities, queue length,
  temperature/humidity exposure, capacity, orders due, inventory days,
  estimated loss value).
- `cratePriceRupees` (₹1,200), `baselineLossRate` (0.22), `targetLossRate`
  (0.08), `coldRoomBaselineCapacity` (120), `batchSize` (100).
- All temperatures shown in-world (~32 °C field heat, ~4–9 °C cold room, etc.).

These are **not** measured local factory data. They exist to demonstrate the
model and must be replaced with calibrated local figures before any claim is
made. The `scenarios.json` file carries a top-level `status: "PROPOSED"` and a
`note` field stating this.

## Rules honoured

- No invented local factory data, shelf-life values, electricity prices, loss
  rates, machine prices, or scheme approvals are presented as fact.
- Demo numbers are editable in one place (`scenarios.json`) for calibration.
- Illustrative percentages from concept boards are **not** treated as validated
  national statistics.
