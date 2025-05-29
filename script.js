let allCharacters = [];
let selectedCharacters = [];

async function loadCharacters() {
  const response = await fetch('characters.json');
  const data = await response.json();
  allCharacters = data.characters;
  updateSuggestions();
  updateSelectedCharacters();
}

function createCharacterCard(character, includeDelete = false) {
  const card = document.createElement('div');
  card.className = `character-card ${character.synergyColor || 'white'}`;

  const img = document.createElement('img');
  img.src = character.image || '';
  img.alt = character.name;

  const content = document.createElement('div');
  content.className = 'character-card-content';

  const name = document.createElement('h4');
  name.textContent = character.name;

  const faction = document.createElement('p');
  faction.textContent = `Faction: ${character.faction}`;

  const role = document.createElement('p');
  role.textContent = `Role: ${character.role}`;

  content.appendChild(name);
  content.appendChild(faction);
  content.appendChild(role);

  if (character.matchNote) {
    const note = document.createElement('p');
    note.textContent = character.matchNote;
    content.appendChild(note);
  }

  card.appendChild(img);
  card.appendChild(content);

  if (includeDelete) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.onclick = () => removeCharacter(character.name);
    card.appendChild(deleteBtn);
  } else {
    card.onclick = () => selectCharacter(character.name);
  }

  return card;
}

function updateSelectedCharacters() {
  const area = document.getElementById('character-select-area');
  area.innerHTML = '';

  for (let i = 0; i < 3; i++) {
    const container = document.createElement('div');
    container.className = 'character-slot';

    if (selectedCharacters[i]) {
      const charData = allCharacters.find(c => c.name === selectedCharacters[i]);
      const card = createCharacterCard(charData, true);
      container.appendChild(card);
    } else {
      container.innerHTML = '+';
      container.onclick = () => openModal(i);
    }

    area.appendChild(container);
  }

  if (selectedCharacters.length === 3) {
    document.getElementById('suggestions-container').style.display = 'none';
    document.getElementById('bangboo-suggestions').style.display = 'block';
    updateBangbooSuggestions();
  } else {
    document.getElementById('suggestions-container').style.display = 'block';
    document.getElementById('bangboo-suggestions').style.display = 'none';
    updateSuggestions();
  }
}

function updateSuggestions() {
  const container = document.getElementById('suggested-characters');
  container.innerHTML = '';
  
  const suggestionsTitle = document.getElementById('suggestions-title');
  if (selectedCharacters.length === 0) {
    suggestionsTitle.style.display = 'none';
    return;
  } else {
    suggestionsTitle.style.display = 'block';
  }

  const selectedData = allCharacters.filter(c => selectedCharacters.includes(c.name));
  const teamFactions = selectedData.map(c => c.faction);
  const teamAttributes = selectedData.map(c => c.attribute);
  const teamRoles = selectedData.map(c => c.role);

  const factionCounts = {};
  teamFactions.forEach(f => factionCounts[f] = (factionCounts[f] || 0) + 1);
  const topFaction = Object.entries(factionCounts).sort((a, b) => b[1] - a[1])[0][0];

  const filtered = allCharacters
    .filter(c => !selectedCharacters.includes(c.name))
    .map(c => {
      const matchesFaction = teamFactions.includes(c.faction);
      const matchesAttribute = teamAttributes.includes(c.attribute);
      const matchesRole = teamRoles.includes(c.role);

      let synergyColor = 'white';
      let noteParts = [];

      if (matchesRole) {
        synergyColor = 'red';
        noteParts.push('Role already in team');
      } else if (matchesFaction && matchesAttribute) {
        synergyColor = 'green';
        noteParts.push(`Matches Faction (${c.faction}) & Attribute (${c.attribute})`);
      } else if (matchesFaction || matchesAttribute) {
        synergyColor = 'yellow';
        if (matchesFaction) noteParts.push(`Matches Faction (${c.faction})`);
        if (matchesAttribute) noteParts.push(`Matches Attribute (${c.attribute})`);
      }

      return {
        ...c,
        synergyColor,
        matchNote: noteParts.join(' | '),
        sortScore: synergyColor === 'green' ? 3 : synergyColor === 'yellow' ? 2 : synergyColor === 'white' ? 1 : 0,
        factionMatchPriority: c.faction === topFaction ? 1 : 0
      };
    })
    .sort((a, b) => {
      if (b.sortScore !== a.sortScore) return b.sortScore - a.sortScore;
      if (b.factionMatchPriority !== a.factionMatchPriority) return b.factionMatchPriority - a.factionMatchPriority;
      return a.name.localeCompare(b.name);
    });

  filtered.forEach(c => {
    const card = createCharacterCard(c);
    container.appendChild(card);
  });
}

function selectCharacter(name) {
  const character = allCharacters.find(c => c.name === name);
  if (
    selectedCharacters.length >= 3 ||
    selectedCharacters.includes(name) ||
    selectedCharacters
      .map(n => allCharacters.find(c => c.name === n).role)
      .includes(character.role)
  ) return;

  selectedCharacters.push(name);
  closeModal();
  updateSelectedCharacters();
}

function removeCharacter(name) {
  selectedCharacters = selectedCharacters.filter(c => c !== name);
  updateSelectedCharacters();
}

function openModal(slotIndex) {
  const modal = document.getElementById('character-modal');
  modal.dataset.slot = slotIndex;
  modal.classList.remove('hidden');

  const content = document.getElementById('modal-character-grid');
  content.innerHTML = '';

  const search = document.getElementById('character-search');
  search.value = '';
  search.oninput = () => updateModalGrid(search.value);

  updateModalGrid('');
}

function updateModalGrid(query) {
  const content = document.getElementById('modal-character-grid');
  content.innerHTML = '';

  const available = allCharacters
    .filter(c => !selectedCharacters.includes(c.name))
    .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  available.forEach(c => {
    const card = createCharacterCard(c);
    content.appendChild(card);
  });
}

function closeModal() {
  document.getElementById('character-modal').classList.add('hidden');
  document.getElementById('modal-character-grid').innerHTML = '';
}

async function updateBangbooSuggestions() {
  const container = document.getElementById('bangboo-list');
  container.innerHTML = '';

  if (selectedCharacters.length < 3) return;

  const response = await fetch('bangboos.json');
  const data = await response.json();
  const allBangboos = data.bangboos;

  const selectedData = allCharacters.filter(c => selectedCharacters.includes(c.name));
  const teamFactions = selectedData.map(c => c.faction);
  const teamAttributes = selectedData.map(c => c.attribute);
  const teamRoles = selectedData.map(c => c.role);
  const allSameFaction = selectedData.every(c => c.faction === teamFactions[0]);

  const factionCounts = {};
  teamFactions.forEach(f => factionCounts[f] = (factionCounts[f] || 0) + 1);
  const topFaction = Object.entries(factionCounts).sort((a, b) => b[1] - a[1])[0][0];

  function scoreBangboo(b) {
    const synergyScore = (b.bonus || []).filter(tag => teamAttributes.includes(tag)).length;
    const factionScore = b.faction === topFaction ? 1 : 0;
    return { synergyScore, factionScore };
  }

  allBangboos
    .map(b => ({ ...b, ...scoreBangboo(b) }))
    .sort((a, b) => {
      if (b.factionScore !== a.factionScore) return b.factionScore - a.factionScore;
      if (b.synergyScore !== a.synergyScore) return b.synergyScore - a.synergyScore;
      return a.name.localeCompare(b.name);
    })
    .forEach(b => {
      let synergyColor = 'white';
      if (allSameFaction && b.faction === teamFactions[0]) synergyColor = 'green';
      else if (b.faction === teamFactions[0] || b.synergyScore > 0) synergyColor = 'yellow';

      const card = document.createElement('div');
      card.className = `character-card ${synergyColor}`;

      const img = document.createElement('img');
      img.src = `bangboo/${b.id}.webp`;
      img.alt = b.name;

      const content = document.createElement('div');
      content.className = 'character-card-content';

      const name = document.createElement('h4');
      name.textContent = b.name;

      const faction = document.createElement('p');
      faction.textContent = `Faction: ${b.faction || 'None'}`;

      const synergy = document.createElement('p');
      synergy.textContent = `Synergy Bonus: ${b.bonus.join(', ')}`;

      const desc = document.createElement('p');
      desc.textContent = b.description;

      content.appendChild(name);
      content.appendChild(faction);
      content.appendChild(synergy);
      content.appendChild(desc);

      card.appendChild(img);
      card.appendChild(content);
      container.appendChild(card);
    });
}

window.onload = loadCharacters;
document.getElementById('modal-close').onclick = closeModal;