# Director Tax Planner

A browser-based planner for UK company directors to work out how much to set
aside each month for their self-assessment tax bill, based on monthly PAYE
salary, dividends and other income.

## What it does

- Log salary (PAYE), dividends (tracked separately as company dividends vs.
  share-dealing dividends, for reference - both are taxed identically),
  other taxable income, untaxed UK bank/building society interest, personal
  pension contributions, Gift Aid donations and capital gains month by
  month for each UK tax year (6 April - 5 April).
- Calculates income tax and dividend tax using the current rest-of-UK
  (England/Wales/NI) rates and bands, including the personal allowance
  taper and dividend allowance. Any personal allowance left unused by
  salary/other income carries forward to shelter savings interest, then
  dividends, rather than being wasted - the common director setup of a low
  salary plus dividends is taxed correctly rather than as if the full
  personal allowance had already been used elsewhere.
- Untaxed interest gets the starting rate for savings (up to £5,000 at 0%,
  reduced £1-for-£1 by non-savings income) and the Personal Savings
  Allowance (£1,000/£500/£0 depending on which tax band your total income
  falls into) applied automatically, stacking after salary/other income but
  before dividends.
- Personal (relief-at-source) pension contributions and Gift Aid donations
  extend your basic/higher-rate bands and reduce adjusted net income for the
  personal allowance taper, giving higher/additional-rate relief on top of
  the basic-rate relief added automatically by the pension provider/charity.
- Calculates Capital Gains Tax separately, using whatever's left of your
  basic-rate band after income and dividends, and the annual exempt amount.
- Works out the self-assessment liability owed on top of tax already
  collected through PAYE.
- Estimates the (likely) **payments on account** and **balancing payment**
  for each year, with due dates, based on the prior year's liability. CGT is
  excluded from payments on account (per HMRC rules) and added in full to
  the balancing payment. If the prior year isn't on record (or its figures
  here don't match reality), you can enter the actual POA1/POA2 amounts
  HMRC has already set for a year directly - this overrides the
  calculation from the prior year everywhere it's used (the Summary,
  Payments ledger, and "paid to HMRC" placeholders).
- Shows a running month-on-month figure for what you should have saved by
  each point in the year to cover that year's tax bill, and compares it
  against what you've actually logged as saved.
- Record what you actually pay HMRC each January (payment on account 1 +
  prior year's balancing payment) and July (prior year's payment on account
  2) - placeholders show the expected amount, and each box is labelled with
  the specific month and calendar year it falls in. The **Timeline** tab
  then tracks total tax liability, total paid, outstanding liability, total
  saved and bank balance continuously across every tax year on record, not
  just the currently selected one.
- The Timeline's **starting point** panel lets you set a known bank balance
  and outstanding tax liability as of the start of a chosen year, so you can
  reconcile going forward from today without having to reconstruct exact
  figures for every earlier year - the running totals reset to those
  figures at that year boundary and ignore history before it. Clear it any
  time to go back to full-history calculation.
- The **Payments** tab is a single chronological ledger of every payment on
  account and balancing payment across every tax year on record, grouped by
  due date, showing what's owed vs. what you've actually recorded as paid
  and whether each is upcoming, overdue, paid or partially paid. A toggle
  there switches on a **projected estimate for the following tax year**
  (the year after the latest one on record) - payment on account 1 and 2
  are projected from the last fully-entered year's liability (not the
  latest year, which may still be in progress and understate a full year),
  shown as clearly-marked "estimated" rows in the ledger and as a dashed
  continuation of the Timeline's outstanding liability line.
- Add new tax years as they roll around - forwards as they arrive, or
  backwards to seed an earlier year you haven't logged yet, so payments on
  account for your earliest tracked year can be calculated properly instead
  of assuming none are required. Every previous year stays on record, and
  tax rates/bands are editable per year so you can update them once
  HMRC/the Budget confirms figures for a new year.
- Any year can be switched to **indicative** entry - yearly totals instead
  of 12 months of detail - handy for an earlier year you just want to seed
  without the busywork. Switch back to monthly entry any time (totals
  spread evenly across the months as a starting point). Indicative years
  are marked with a badge and show a simplified totals form in place of the
  monthly table.
- Each year can be cleared (reset its data, keep the year) or deleted
  entirely (remove it from the planner) from its own header, both behind a
  confirmation prompt so it isn't done by accident.
- All data is stored locally in your browser (localStorage). Use
  Export/Import to back up or move your data between browsers/devices.

Figures are estimates for planning purposes only, not tax advice - they
don't account for Scottish income tax rates, marriage allowance, the High
Income Child Benefit Charge, student loan repayments, or other reliefs.
Capital Gains Tax on residential property usually has its own 60-day
reporting/payment deadline, separate from self-assessment - this planner
shows it together with the balancing payment for simplicity.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and build for production
npm run lint     # oxlint
```
