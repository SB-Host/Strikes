/**
 * Strike Log — builds the whole thing in one run.
 *
 * Creates:
 *   1. A form with a "Who" dropdown and a "Why" multiple choice (with Other)
 *   2. A linked spreadsheet that collects every submission
 *   3. A "Standings" tab — strike count per person, updating on its own
 *   4. A "Recent" tab — the log, newest first
 *
 * Run setUpStrikes() once. Everything after that happens by itself.
 */

var FORM_TITLE  = 'Strike Log';
var SHEET_TITLE = 'Strikes';

/* Edit this list any time — then run syncRoster() to push changes to the form. */
var PEOPLE = [
  'Q',
  'Brandon Burgess',
  'brayden maloney',
  'Brody Maes',
  'Cam Lailey',
  'Colin Bywater',
  'cooper jerkoff',
  'drew baker',
  'easton chandler',
  'Fisher Stock',
  'gabrial beck',
  'gary williamson lll',
  'jack obrian',
  'Jamie Walter',
  'Jimmy Zeissel',
  'Leo Nicholson',
  'luke Brooks',
  'luke Goldberg',
  'micha moraly',
  'Mickey Holwick',
  'Nolan Wright',
  'Olaf Barradas',
  'Sam Piacitelli',
  'sean Narduzzi',
  'stokley gardner',
  'talon cato',
  'tanner obrian',
  'taylor jeffery',
  'zach Rosenfeld',
  'zach toriis'
];

var REASONS = [
  'being a loser',
  'forgetting a name',
  'Being a dipshit',
  'Fuck you'
];

/* ------------------------------------------------------------------ *
 * Setup — run this one
 * ------------------------------------------------------------------ */

function setUpStrikes() {
  var form = FormApp.create(FORM_TITLE);
  form.setDescription('Log a strike. Takes five seconds.');
  form.setConfirmationMessage('Logged. It shows up on the sheet right away.');
  form.setProgressBar(false);
  form.setAllowResponseEdits(false);

  // Records which leader submitted, without adding a question they have to fill.
  // Not every account type allows this, so fall back quietly rather than fail.
  try {
    form.setEmailCollectionType(FormApp.EmailCollectionType.VERIFIED);
  } catch (e) {
    try { form.setCollectEmail(true); } catch (e2) { /* fine — skip it */ }
  }

  form.addListItem()
      .setTitle('Who')
      .setChoiceValues(PEOPLE)
      .setRequired(true);

  // A dropdown can't carry an "Other" box in Google Forms. Multiple choice can.
  form.addMultipleChoiceItem()
      .setTitle('Why')
      .setChoiceValues(REASONS)
      .showOtherOption(true)
      .setRequired(true);

  form.addTextItem()
      .setTitle('Notes')
      .setHelpText('Optional — anything worth remembering later.')
      .setRequired(false);

  var ss = SpreadsheetApp.create(SHEET_TITLE);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();

  // Linking creates a new tab, so reopen to see it.
  ss = SpreadsheetApp.openById(ss.getId());
  var responses = findResponseSheet_(ss);

  buildStandings_(ss, responses);
  buildRecent_(ss, responses);

  // Drop the empty default tab.
  var blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);
  ss.setActiveSheet(ss.getSheetByName('Standings'));

  // Remember where things live so syncRoster() can find them later.
  var props = PropertiesService.getDocumentProperties() || PropertiesService.getUserProperties();
  props.setProperty('STRIKE_FORM_ID', form.getId());
  props.setProperty('STRIKE_SHEET_ID', ss.getId());

  var out = [
    '',
    '=========================================================',
    '  DONE. Three links — they do different jobs.',
    '=========================================================',
    '',
    '  1. FORM — send this to your LEADERS only.',
    '     ' + form.getPublishedUrl(),
    '',
    '  2. SHEET — share this with EVERYONE, set to Viewer.',
    '     ' + ss.getUrl(),
    '',
    '  3. FORM EDITOR — keep this one to yourself.',
    '     ' + form.getEditUrl(),
    ''
  ].join('\n');

  Logger.log(out);
  return out;
}

/* ------------------------------------------------------------------ *
 * Roster changes — edit PEOPLE above, then run this
 * ------------------------------------------------------------------ */

function syncRoster() {
  var props = PropertiesService.getDocumentProperties() || PropertiesService.getUserProperties();
  var formId = props.getProperty('STRIKE_FORM_ID');
  var sheetId = props.getProperty('STRIKE_SHEET_ID');
  if (!formId || !sheetId) {
    throw new Error('Run setUpStrikes() first — nothing to sync yet.');
  }

  var form = FormApp.openById(formId);
  var items = form.getItems(FormApp.ItemType.LIST);
  for (var i = 0; i < items.length; i++) {
    if (items[i].getTitle() === 'Who') {
      items[i].asListItem().setChoiceValues(PEOPLE);
    }
  }

  // Rebuild Standings so new people get a row and removed ones drop off.
  var ss = SpreadsheetApp.openById(sheetId);
  var old = ss.getSheetByName('Standings');
  if (old) ss.deleteSheet(old);
  buildStandings_(ss, findResponseSheet_(ss));
  ss.setActiveSheet(ss.getSheetByName('Standings'));

  Logger.log('Roster synced — ' + PEOPLE.length + ' people on the form and the sheet.');
}

/* ------------------------------------------------------------------ *
 * Internals
 * ------------------------------------------------------------------ */

function findResponseSheet_(ss) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().indexOf('Form Responses') === 0) return sheets[i].getName();
  }
  throw new Error('Could not find the form responses tab.');
}

/**
 * Columns shift depending on whether email collection is on, so every formula
 * finds its column by matching the header text instead of hard-coding a letter.
 */
function col_(responses, header) {
  var q = "'" + responses + "'";
  return 'INDEX(' + q + '!$A:$Z, 0, MATCH("' + header + '", ' + q + '!$1:$1, 0))';
}

function buildStandings_(ss, responses) {
  var sh = ss.insertSheet('Standings', 0);
  var who  = col_(responses, 'Who');
  var when = col_(responses, 'Timestamp');
  var why  = col_(responses, 'Why');

  sh.getRange('A1:E1')
    .setValues([['Name', 'Strikes', 'Last strike', 'Days since', 'Most recent reason']])
    .setFontWeight('bold')
    .setBackground('#1f2937')
    .setFontColor('#ffffff');

  var rows = [];
  for (var i = 0; i < PEOPLE.length; i++) {
    var r = i + 2;
    var count = 'COUNTIF(' + who + ', $A' + r + ')';
    rows.push([
      PEOPLE[i],
      '=IFERROR(' + count + ', 0)',
      '=IFERROR(IF(' + count + '=0, "", MAX(FILTER(' + when + ', ' + who + '=$A' + r + '))), "")',
      '=IF($C' + r + '="", "", INT(TODAY()-$C' + r + '))',
      '=IFERROR(INDEX(FILTER(' + why + ', ' + who + '=$A' + r + '), ' + count + '), "")'
    ]);
  }
  sh.getRange(2, 1, rows.length, 5).setValues(rows);

  sh.getRange(2, 3, rows.length, 1).setNumberFormat('ddd d mmm, h:mm am/pm');
  sh.setFrozenRows(1);
  sh.getRange(1, 1, rows.length + 1, 5).createFilter();
  sh.setColumnWidth(1, 190);
  sh.setColumnWidth(3, 170);
  sh.setColumnWidth(5, 240);

  // Colour the count so the people who are piling them up stand out.
  var target = [sh.getRange(2, 2, rows.length, 1)];
  var rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThanOrEqualTo(3).setBackground('#fecaca').setFontColor('#7f1d1d')
      .setRanges(target).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberEqualTo(2).setBackground('#fed7aa').setFontColor('#7c2d12')
      .setRanges(target).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberEqualTo(0).setFontColor('#9ca3af')
      .setRanges(target).build()
  ];
  sh.setConditionalFormatRules(rules);
}

function buildRecent_(ss, responses) {
  var sh = ss.insertSheet('Recent', 1);
  var q = "'" + responses + "'";

  sh.getRange('A1').setFormula(
    '=IFERROR(' +
      '{' + q + '!A1:E1; SORT(FILTER(' + q + '!A2:E, ' + q + '!A2:A<>""), 1, FALSE)}, ' +
      '"Nothing logged yet."' +
    ')'
  );

  sh.getRange('A1:E1').setFontWeight('bold').setBackground('#1f2937').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 170);
  sh.setColumnWidth(3, 190);
  sh.setColumnWidth(4, 220);
}
