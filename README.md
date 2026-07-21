# Director Tax Planner

A browser-based planner for UK company directors to work out how much to set
aside each month for their self-assessment tax bill, based on monthly PAYE
salary, dividends and other income.

## What it does

- Log salary (PAYE), dividends and other taxable income month by month for
  each UK tax year (6 April - 5 April).
- Calculates income tax and dividend tax using the current rest-of-UK
  (England/Wales/NI) rates and bands, including the personal allowance
  taper and dividend allowance.
- Works out the self-assessment liability owed on top of tax already
  collected through PAYE.
- Estimates the (likely) **payments on account** and **balancing payment**
  for each year, with due dates, based on the prior year's liability.
- Shows a running month-on-month figure for what you should have saved by
  each point in the year to cover that year's tax bill, and compares it
  against what you've actually logged as saved.
- Add new tax years as they roll around while keeping every previous year on
  record. Tax rates/bands are editable per year so you can update them once
  HMRC/the Budget confirms figures for a new year.
- All data is stored locally in your browser (localStorage). Use
  Export/Import to back up or move your data between browsers/devices.

Figures are estimates for planning purposes only, not tax advice - they
don't account for Scottish income tax rates, pension contributions, Gift
Aid, capital gains, or other reliefs.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and build for production
npm run lint     # oxlint
```
