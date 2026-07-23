# Childminder Income Tracker

A browser-based income tracker and forecaster for UK childminders - set up
your local authorities' funding rates and your own private rates, add the
children you look after, and see a realistic weekly/termly income forecast
that accounts for term-time-only funding, holidays, and mid-term funding
rate changes.

## What it does

- **Local authorities & funding rates** - add each local authority you deal
  with and record their hourly funding rate per age band (9 months-2
  years, 2 years, 3 & 4 years - editable) and funding type (15 hours
  universal / 30 hours extended for working parents). Rates carry an
  effective-from date, so you can add a future increase ahead of time and
  the forecast switches to it automatically once that date arrives, while
  everything before it still uses the old rate.
- **Funding payment schedule** - records how each local authority actually
  pays you: one lump sum per term (in arrears, after headcount) or spread
  across monthly instalments, whichever you've agreed. The Forecast tab
  shows a separate ledger of when that money is expected to land, distinct
  from the weekly accrual figures.
- **Your own rates** - set your private (non-funded) hourly rate, with an
  optional age-specific override (e.g. a higher baby rate), plus a late
  pickup charge (flat fee, per hour, or per 15 minutes, with a grace
  period).
- **Children** - name, date of birth, contract dates, assigned local
  authority and funding type, and a full parent/carer contact card
  (primary parent, optional secondary parent, and an emergency contact)
  for quick access to names and numbers. Each child has a proposed weekly
  schedule with individual start/finish times per day, not just a total
  hours figure.
- **Term dates** - record each term's start/end date and academic year.
  Funded hours only apply during a term; everything outside one is treated
  as non-term time.
- **Funding eligibility on a child's birthday** - a child doesn't become
  eligible for a new funded age band the moment they have a birthday.
  Funding follows the standard national rule: eligibility starts from the
  next funding "count date" (1 January, 1 April or 1 September) on or
  after the qualifying birthday, matched to the following term. The
  forecast applies this automatically per child, per term.
- **Holidays** - log the childminder's own holidays (fully closed) and
  individual children's holidays separately. During any holiday, non-funded
  hours are billed at half rate as a retainer, and no funded hours are
  claimed for that week since the child isn't attending.
- **Forecast** - a week-by-week income forecast over a chosen horizon
  (4-52 weeks), showing scheduled hours, funded hours/income, non-funded
  ("parental") hours/income, and holiday/term status per week, with a
  stacked chart. Toggle between a combined total and a per-child
  breakdown, with a running total per child and a drill-down weekly table
  for any one child.
- **Attendance register** - log actual arrival/departure against each
  child's scheduled hours, purely for your own records and safeguarding -
  it never affects billing, since fees are charged in advance from the
  proposed weekly schedule. Late arrivals and no-shows are highlighted
  with a safeguarding flag (auto-suggested, editable) and a dedicated notes
  field, plus a "Safeguarding flags" view listing every flagged record so
  nothing gets missed, in line with Ofsted's expectation that childminders
  actively follow up on both. A suggested late-pickup charge is shown for
  reference (not added to the forecast automatically).
- All data is stored locally in your browser (localStorage). Use
  Export/Import to back up or move your data between browsers/devices.

Figures are estimates for planning purposes only. Always confirm exact
funding rates, eligibility start terms and payment schedules with your
local authority - rules and figures vary by council and change over time.

### iOS/mobile notes

- Form fields use 16px text so iOS Safari doesn't auto-zoom the page when
  one is focused.
- Installed to the home screen, it respects the notch/Dynamic Island and
  home indicator safe areas and runs without Safari's browser chrome.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and build for production
npm run lint     # oxlint
```

## Running as a native iOS app (Xcode)

The app is wrapped with [Capacitor](https://capacitorjs.com), which loads
the same web build inside a thin native shell - no code changes needed
elsewhere in the app. The `ios/` folder is committed to the repo and uses
Swift Package Manager, not CocoaPods, so there's no `pod install` step.

**On your Mac:**

1. Clone the repo and check out this branch, then install dependencies:
   ```bash
   npm install
   ```
2. Build the web app and copy it into the iOS project:
   ```bash
   npm run cap:sync
   ```
   Run this again after every code change you want to test on device/in
   Xcode - it rebuilds `dist/` and copies it into `ios/App/App/public`.
3. Open the Xcode project:
   ```bash
   npx cap open ios
   ```
   (or open `ios/App/App.xcodeproj` directly in Xcode)
4. In Xcode, select the **App** target -> **Signing & Capabilities** tab,
   and choose your Apple ID under **Team** (add your Apple ID in
   Xcode -> Settings -> Accounts first if you haven't already). Xcode will
   generate a free personal provisioning profile automatically.
5. Pick a simulator or your plugged-in iPhone from the device dropdown at
   the top, then press the Run button (▶) to build and launch it.

**To submit to the App Store**, you'll additionally need:
- An [Apple Developer Program](https://developer.apple.com/programs/)
  membership ($99/year) - free personal accounts can run the app on your
  own device but can't submit to the App Store.
- In Xcode: **Product -> Archive**, then use the Organizer window that
  opens to **Distribute App -> App Store Connect**.
- An App Store Connect listing (app name, screenshots, description,
  privacy policy - straightforward here since there's no backend, no
  accounts, and no tracking; all data stays on-device) created at
  [appstoreconnect.apple.com](https://appstoreconnect.apple.com).

The bundle identifier is `com.pluck1983.childminderincometracker` and the
display name is "Childminder Tracker" (both set in `capacitor.config.ts`
and the Xcode project) - change either before submitting if you'd prefer
something else; the bundle ID especially can't be changed later once
published. The app icon is generated from the existing brand mark
(`scripts/icon-source.svg`) - replace
`ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
(a single 1024×1024 PNG, no transparency) with something custom if you'd
like a different one.
