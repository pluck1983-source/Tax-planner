# Director Tax Planner

A browser-based planner for UK company directors to work out how much to set
aside each month for their self-assessment tax bill, based on monthly PAYE
salary, dividends and other income.

## What it does

- Log salary (PAYE), dividends (tracked separately as company dividends vs.
  share-dealing dividends, for reference - both are taxed identically),
  other taxable income, personal pension contributions, Gift Aid donations
  and capital gains month by month for each UK tax year (6 April - 5 April).
- Calculates income tax and dividend tax using the current rest-of-UK
  (England/Wales/NI) rates and bands, including the personal allowance
  taper and dividend allowance.
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
  the balancing payment.
- Shows a running month-on-month figure for what you should have saved by
  each point in the year to cover that year's tax bill, and compares it
  against what you've actually logged as saved.
- Record what you actually pay HMRC each January (payment on account 1 +
  prior year's balancing payment) and July (prior year's payment on account
  2) - placeholders show the expected amount. The **Timeline** tab then
  tracks total tax liability, total paid, outstanding liability, total
  saved and bank balance continuously across every tax year on record, not
  just the currently selected one.
- The **Payments** tab is a single chronological ledger of every payment on
  account and balancing payment across every tax year on record, grouped by
  due date, showing what's owed vs. what you've actually recorded as paid
  and whether each is upcoming, overdue, paid or partially paid.
- Add new tax years as they roll around - forwards as they arrive, or
  backwards to seed an earlier year you haven't logged yet, so payments on
  account for your earliest tracked year can be calculated properly instead
  of assuming none are required. Every previous year stays on record, and
  tax rates/bands are editable per year so you can update them once
  HMRC/the Budget confirms figures for a new year.
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
