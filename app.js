(() => {
  const $ = (id) => document.getElementById(id);

  const state = {
    birthdayConfirmed: false,
    humanVerified: false,
    termsAccepted: false,
    birthdayLow: new Date(1900, 0, 1),
    birthdayHigh: new Date(2026, 8, 13),
    birthdayGuess: null,
  };

  const toast = (title, message) => {
    const node = document.createElement('div');
    node.className = 'toast';
    node.innerHTML = `<strong>${title}</strong>${message}`;
    $('toastStack').appendChild(node);
    window.setTimeout(() => node.remove(), 3600);
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied', `${label} copied to your clipboard.`);
    } catch {
      toast('Clipboard declined', `Please memorize ${label.toLowerCase()} instead.`);
    }
  };

  $('themeButton').addEventListener('click', () => {
    document.documentElement.classList.toggle('light');
  });

  const viewButtons = [...document.querySelectorAll('[data-view-target]')];
  const views = [...document.querySelectorAll('.app-view')];
  const openView = (name) => {
    views.forEach((view) => {
      const active = view.dataset.view === name;
      view.hidden = !active;
      view.classList.toggle('active', active);
    });
    viewButtons.forEach((button) => button.classList.toggle('active', button.dataset.viewTarget === name));
    window.location.hash = name === 'signup' ? '' : name;
  };
  viewButtons.forEach((button) => button.addEventListener('click', () => openView(button.dataset.viewTarget)));
  const initialView = window.location.hash.slice(1);
  if (views.some((view) => view.dataset.view === initialView)) openView(initialView);

  const confidence = $('confidence');
  const confidenceOut = $('confidenceOut');
  confidence.addEventListener('input', () => {
    confidenceOut.value = `${confidence.value}%`;
  });

  const nameAlphabet = " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-'";
  let nameChars = ['A'];
  let nameCursor = 0;
  const renderNameMachine = () => {
    const value = nameChars.join('');
    $('displayName').value = value;
    $('nameMachineDisplay').textContent = value || ' ';
    $('nameCurrentChar').textContent = nameChars[nameCursor] === ' ' ? 'SPACE' : nameChars[nameCursor];
    $('nameCursorLabel').textContent = `Position ${nameCursor + 1} of ${nameChars.length}`;
  };
  const shiftNameCharacter = (delta) => {
    const current = nameAlphabet.indexOf(nameChars[nameCursor]);
    const next = (current + delta + nameAlphabet.length) % nameAlphabet.length;
    nameChars[nameCursor] = nameAlphabet[next];
    renderNameMachine();
  };
  $('namePrevChar').addEventListener('click', () => shiftNameCharacter(-1));
  $('nameNextChar').addEventListener('click', () => shiftNameCharacter(1));
  $('namePrevPos').addEventListener('click', () => { nameCursor = (nameCursor - 1 + nameChars.length) % nameChars.length; renderNameMachine(); });
  $('nameNextPos').addEventListener('click', () => { nameCursor = (nameCursor + 1) % nameChars.length; renderNameMachine(); });
  $('nameInsert').addEventListener('click', () => {
    if (nameChars.length >= 32) return toast('Name capacity reached', 'Display names are limited to 32 individually selected positions.');
    nameChars.splice(nameCursor + 1, 0, 'A');
    nameCursor += 1;
    renderNameMachine();
  });
  $('nameDelete').addEventListener('click', () => {
    if (nameChars.length === 1) return toast('Position retained', 'At least one display-name position is required.');
    nameChars.splice(nameCursor, 1);
    nameCursor = Math.min(nameCursor, nameChars.length - 1);
    renderNameMachine();
  });
  renderNameMachine();

  const usernameSlider = $('usernameSlider');
  const usernameValue = $('usernameValue');
  const usernamePosition = $('usernamePosition');
  const usernameAlphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const usernameCount = usernameAlphabet.length ** 6;

  const usernameFromIndex = (index) => {
    let n = Number(index);
    let result = '';
    for (let i = 0; i < 6; i += 1) {
      result = usernameAlphabet[n % usernameAlphabet.length] + result;
      n = Math.floor(n / usernameAlphabet.length);
    }
    return result;
  };

  const updateUsername = () => {
    const index = Number(usernameSlider.value);
    usernameValue.textContent = usernameFromIndex(index);
    usernamePosition.textContent = `${(index + 1).toLocaleString()} of ${usernameCount.toLocaleString()} combinations`;
  };
  usernameSlider.max = String(usernameCount - 1);
  usernameSlider.addEventListener('input', updateUsername);
  updateUsername();
  $('copyUsername').addEventListener('click', () => copyText(`@${usernameValue.textContent}`, 'Username'));

  const cloneDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dateToDay = (date) => Math.floor(date.getTime() / 86400000);
  const dayToDate = (day) => new Date(day * 86400000);
  const formatDate = (date) => date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

  const nextBirthdayGuess = () => {
    const low = dateToDay(state.birthdayLow);
    const high = dateToDay(state.birthdayHigh);
    state.birthdayGuess = dayToDate(Math.floor((low + high) / 2));
    $('birthdayGuess').textContent = formatDate(state.birthdayGuess);
    const remaining = Math.max(1, high - low + 1);
    const questions = Math.ceil(Math.log2(remaining));
    $('birthdayStatus').textContent = `At most ${questions} more yes/no decisions required. Very efficient.`;
  };

  const answerBirthday = (direction) => {
    if (state.birthdayConfirmed) {
      toast('Birthday locked', 'We already found it. Reopening the search would be inefficient.');
      return;
    }
    const guessDay = dateToDay(state.birthdayGuess);
    if (direction === 'earlier') state.birthdayHigh = dayToDate(guessDay - 1);
    if (direction === 'later') state.birthdayLow = dayToDate(guessDay + 1);

    if (dateToDay(state.birthdayLow) > dateToDay(state.birthdayHigh)) {
      state.birthdayLow = cloneDate(state.birthdayGuess);
      state.birthdayHigh = cloneDate(state.birthdayGuess);
      toast('Temporal contradiction', 'Your answers crossed. The search has been reset around the last plausible date.');
    }
    nextBirthdayGuess();
  };

  $('birthdayEarlier').addEventListener('click', () => answerBirthday('earlier'));
  $('birthdayLater').addEventListener('click', () => answerBirthday('later'));
  $('birthdayCorrect').addEventListener('click', () => {
    state.birthdayConfirmed = true;
    $('birthdayStatus').textContent = `Confirmed: ${formatDate(state.birthdayGuess)}. Only one click was required once we guessed correctly.`;
    toast('Date accepted', 'Binary search has successfully replaced the calendar.');
  });
  nextBirthdayGuess();

  const words = [
    'amber','anchor','apple','atlas','bamboo','beacon','berry','birch','bison','blue','bravo','brick','cabin','cactus','cedar','cello',
    'cinder','cobalt','comet','coral','crane','delta','dune','ember','falcon','fern','fjord','flint','forest','frost','globe','harbor',
    'hazel','honey','indigo','iris','ivory','jade','juniper','kiwi','lagoon','lemon','lilac','lunar','maple','marble','meadow','mint',
    'moss','nova','oasis','olive','onyx','orbit','pearl','pine','pixel','plum','quartz','raven','river','solar','spruce','tulip'
  ];
  const symbols = ['!','@','#','$','%','^','&','*','?','+','=','~'];
  const passwordControls = ['passwordWordA','passwordWordB','passwordWordC','passwordNumber','passwordSymbol'].map($);

  const updatePassword = () => {
    const [a,b,c,n,s] = passwordControls.map((control) => Number(control.value));
    $('passwordValue').textContent = `${words[a]}-${words[b]}-${words[c]}-${String(n).padStart(2,'0')}${symbols[s]}`;
  };
  passwordControls.forEach((control) => control.addEventListener('input', updatePassword));
  updatePassword();
  $('copyPassword').addEventListener('click', () => copyText($('passwordValue').textContent, 'Generated password'));

  const policyModal = $('policyModal');
  const openPolicy = () => { policyModal.classList.add('open'); policyModal.setAttribute('aria-hidden', 'false'); };
  const closePolicy = () => { policyModal.classList.remove('open'); policyModal.setAttribute('aria-hidden', 'true'); };
  $('passwordPolicy').addEventListener('click', openPolicy);
  $('closePolicy').addEventListener('click', closePolicy);
  $('ackPolicy').addEventListener('click', () => { closePolicy(); toast('Policy acknowledged', 'Your understanding has been recorded at an unspecified confidence level.'); });
  policyModal.addEventListener('click', (event) => { if (event.target === policyModal) closePolicy(); });

  const phoneSlider = $('phoneSlider');
  const formatPhone = (value) => {
    const digits = String(Math.round(Number(value))).padStart(10, '0');
    return `+1 (${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  };
  const updatePhone = () => { $('phoneDisplay').textContent = formatPhone(phoneSlider.value); };
  phoneSlider.addEventListener('input', updatePhone);
  updatePhone();
  $('randomPhone').addEventListener('click', () => {
    phoneSlider.value = String(Math.floor(Math.random() * 10000000000));
    updatePhone();
    toast('Excellent choice', 'A phone number has been selected with complete disregard for ownership.');
  });

  const termsSlider = $('termsSlider');
  const consentBox = $('consentBox');
  termsSlider.addEventListener('input', () => {
    const page = Number(termsSlider.value);
    $('termsPage').textContent = `Page ${page} of 84`;
    const finished = page === 84;
    consentBox.disabled = !finished;
    if (!finished) {
      state.termsAccepted = false;
      consentBox.classList.remove('checked');
      consentBox.setAttribute('aria-checked', 'false');
    }
  });
  consentBox.addEventListener('click', () => {
    if (consentBox.disabled) return;
    state.termsAccepted = !state.termsAccepted;
    consentBox.classList.toggle('checked', state.termsAccepted);
    consentBox.setAttribute('aria-checked', String(state.termsAccepted));
  });

  const verifyControls = ['verifyA','verifyB','verifyC'].map($);
  const updateVerify = () => {
    const values = verifyControls.map((control) => Number(control.value));
    values.forEach((value, index) => { $(`verify${'ABC'[index]}Out`).value = String(value); });
    const total = values.reduce((sum, value) => sum + value, 0);
    $('humanStatus').textContent = state.humanVerified ? 'Verified. You have demonstrated arithmetic intent.' : `Current total: ${total}`;
    return total;
  };
  verifyControls.forEach((control) => control.addEventListener('input', () => {
    state.humanVerified = false;
    updateVerify();
  }));
  $('verifyHuman').addEventListener('click', () => {
    const total = updateVerify();
    if (total === 100) {
      state.humanVerified = true;
      updateVerify();
      toast('Human enough', 'The sliders add to 100. Robotics remain statistically possible.');
    } else {
      toast('Verification failed', `The total is ${total}. Northstar requires exactly 100, for reasons.`);
    }
  });
  updateVerify();

  let selectedVolume = 50;
  const volumePicker = $('volumePicker');
  const renderVolumeOptions = () => {
    volumePicker.innerHTML = '';
    for (let value = 1; value <= 100; value += 1) {
      const label = document.createElement('label');
      label.className = 'volume-option';
      label.innerHTML = `<input type="radio" name="volume" value="${value}" ${value === selectedVolume ? 'checked' : ''}><span>Volume ${value}</span>`;
      const input = label.querySelector('input');
      input.addEventListener('change', () => {
        selectedVolume = value;
        $('volumeValue').textContent = `Volume ${value}`;
        renderChallenge();
      });
      volumePicker.appendChild(label);
    }
  };
  renderVolumeOptions();

  const digestMinute = $('digestMinute');
  for (let minute = 0; minute < 1440; minute += 1) {
    const hour = Math.floor(minute / 60);
    const mins = minute % 60;
    const option = document.createElement('option');
    option.value = String(minute);
    option.textContent = `${String(hour).padStart(2, '0')}:${String(mins).padStart(2, '0')} — minute ${minute + 1} of 1,440`;
    if (minute === 540) option.selected = true;
    digestMinute.appendChild(option);
  }

  const deliveryCertainty = $('deliveryCertainty');
  const updateDeliveryCertainty = () => {
    $('deliveryCertaintyOut').value = `${(Number(deliveryCertainty.value) / 100).toFixed(2)}%`;
  };
  deliveryCertainty.addEventListener('input', updateDeliveryCertainty);
  updateDeliveryCertainty();

  const accentIndex = $('accentIndex');
  const updateAccent = () => {
    const numeric = Number(accentIndex.value);
    const hex = `#${numeric.toString(16).padStart(6, '0').toUpperCase()}`;
    $('accentHex').textContent = hex;
    $('accentSwatch').style.background = hex;
    $('accentPosition').textContent = `Color ${(numeric + 1).toLocaleString()} of 16,777,216`;
    document.documentElement.style.setProperty('--accent', hex);
  };
  accentIndex.addEventListener('input', updateAccent);
  updateAccent();

  $('resetSettings').addEventListener('click', () => {
    selectedVolume = 50;
    renderVolumeOptions();
    $('volumeValue').textContent = 'Volume 50';
    digestMinute.value = '720';
    deliveryCertainty.value = '5000';
    updateDeliveryCertainty();
    accentIndex.value = '8388608';
    updateAccent();
    renderChallenge();
    toast('Settings reset', 'Every enumerated control has returned to its numerical midpoint.');
  });

  const challengeInput = $('challengeInput');
  let unlockedRules = 1;
  const digitSum = (value) => [...value].filter((char) => /\d/.test(char)).reduce((sum, char) => sum + Number(char), 0);
  const vowelCount = (value) => (value.match(/[aeiou]/gi) || []).length;
  const compactLength = (value) => value.replace(/\s/g, '').length;
  const hasReverseRun = (value) => {
    const lower = value.toLowerCase();
    for (let i = 0; i < lower.length - 2; i += 1) {
      const a = lower.charCodeAt(i);
      const b = lower.charCodeAt(i + 1);
      const c = lower.charCodeAt(i + 2);
      if (a >= 99 && a <= 122 && b === a - 1 && c === b - 1) return true;
    }
    return false;
  };
  const checksum = (value) => [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 11;
  const challengeRules = [
    { text: () => 'Use at least 16 characters.', test: (v) => v.length >= 16 },
    { text: () => 'Include exactly two hyphens.', test: (v) => (v.match(/-/g) || []).length === 2 },
    { text: () => 'Include both uppercase and lowercase letters.', test: (v) => /[A-Z]/.test(v) && /[a-z]/.test(v) },
    { text: () => `Include the current audio setting as V${selectedVolume}.`, test: (v) => v.includes(`V${selectedVolume}`) },
    { text: () => 'The sum of every digit in the phrase must be even.', test: (v) => /\d/.test(v) && digitSum(v) % 2 === 0 },
    { text: () => 'Use an even number of vowels, with at least four total.', test: (v) => vowelCount(v) >= 4 && vowelCount(v) % 2 === 0 },
    { text: () => 'The first and last character must match, ignoring case.', test: (v) => v.length > 1 && v[0].toLowerCase() === v[v.length - 1].toLowerCase() },
    { text: () => 'Ignoring spaces, the character count must be divisible by 7.', test: (v) => compactLength(v) > 0 && compactLength(v) % 7 === 0 },
    { text: () => 'Include three consecutive letters in reverse alphabetical order, such as cba or fed.', test: hasReverseRun },
    { text: () => `The text checksum must equal 0 modulo 11. Current checksum: ${checksum(challengeInput.value)}.`, test: (v) => v.length > 0 && checksum(v) === 0 },
  ];

  function renderChallenge() {
    if (!challengeInput) return;
    const value = challengeInput.value;
    while (unlockedRules < challengeRules.length) {
      const visiblePassed = challengeRules.slice(0, unlockedRules).every((rule) => rule.test(value));
      if (!visiblePassed) break;
      unlockedRules += 1;
    }
    const stack = $('ruleStack');
    stack.innerHTML = '';
    let passed = 0;
    challengeRules.slice(0, unlockedRules).forEach((rule, index) => {
      const ok = rule.test(value);
      if (ok) passed += 1;
      const item = document.createElement('div');
      item.className = `rule-card ${ok ? 'pass' : 'fail'}`;
      item.innerHTML = `<span>${ok ? '✓' : String(index + 1).padStart(2, '0')}</span><div><strong>Rule ${index + 1}</strong><p>${rule.text()}</p></div>`;
      stack.appendChild(item);
    });
    $('challengeScore').textContent = String(passed);
    const complete = unlockedRules === challengeRules.length && challengeRules.every((rule) => rule.test(value));
    $('challengeComplete').hidden = !complete;
  }
  challengeInput.addEventListener('input', renderChallenge);
  renderChallenge();

  const saveMessages = [
    'All changes saved 3 seconds from now',
    'Autosave waiting for a more meaningful change',
    'Changes locally remembered with confidence',
    'Save status successfully refreshed',
  ];
  let saveIndex = 0;
  window.setInterval(() => {
    saveIndex = (saveIndex + 1) % saveMessages.length;
    $('saveStatus').textContent = saveMessages[saveIndex];
  }, 4800);

  $('backButton').addEventListener('click', () => {
    $('progressLabel').textContent = '25%';
    $('progressFill').style.width = '25%';
    toast('Moved back', 'Progress changed to 25%. Your entered values remain here for operational continuity.');
    window.setTimeout(() => {
      $('progressLabel').textContent = '50%';
      $('progressFill').style.width = '50%';
    }, 1800);
  });

  $('hostileForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const missing = [];
    if (!$('displayName').value.trim()) missing.push('a display name');
    if (!state.birthdayConfirmed) missing.push('a binary-searched birthday');
    if (!state.termsAccepted) missing.push('page 84 and the consent checkbox');
    if (!state.humanVerified) missing.push('a verification total of exactly 100');

    if (missing.length) {
      toast('Not quite complete', `Still required: ${missing.join(', ')}.`);
      return;
    }

    $('progressLabel').textContent = '75%';
    $('progressFill').style.width = '75%';
    toast('Identity accepted', 'Step 2 is complete. Against all odds, every hostile control produced valid data.');
  });
})();
