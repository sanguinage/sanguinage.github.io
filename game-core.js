// ====================================================================
// 🛡️ GAME-CORE.JS — Reino do Caos (SEM RESTRIÇÕES DE UUID + TÍTULO INICIAL)
// ====================================================================
const GAME_CONFIG = {
  supabaseUrl: 'https://juxjacibwskacnudwghb.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1eGphY2lid3NrYWNudWR3Z2hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTk2MDQsImV4cCI6MjA3NDQ5NTYwNH0.D8eX69IQ5hYHBpqKLqb_K5MJFtCND5stVSj_VVP_txQ',
  homeUrl: './homeplayer.html',
  loginUrl: './index.html'
};
const supabase = window.supabase.createClient(GAME_CONFIG.supabaseUrl, GAME_CONFIG.supabaseKey);

// ====================================================================
// 🔒 Autenticação — ACEITA ID NUMÉRICO (SEU CASO)
// ====================================================================
function requireAuth() {
  const idusuario = localStorage.getItem('idusuario');
  if (!idusuario || !isValidUserId(idusuario)) {
    alert('Sessão inválida. Faça login novamente.');
    localStorage.clear();
    window.location.href = GAME_CONFIG.loginUrl;
  }
}

function logout() {
  localStorage.clear();
  window.location.href = GAME_CONFIG.loginUrl;
}

// ✅ Aceita número inteiro (ex: "123") OU UUID
function isValidUserId(id) {
  if (!id) return false;
  if (/^\d+$/.test(id.trim())) return true; // número
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id); // UUID
}

// ====================================================================
// 💾 Player — com atributos e título
// ====================================================================
async function fetchPlayerFromDB(idplayer) {
  if (!idplayer) return null;
  
  const { data: player, error } = await supabase
    .from('player')
    .select('*')
    .eq('idplayer', idplayer)
    .single();
  
  if (error) return null;

  let titulo = '-';
  if (player.idtitulofk) {
    const { data: tituloData } = await supabase
      .from('titulos')
      .select('descricao')
      .eq('idtitulo', player.idtitulofk)
      .single();
    
    if (tituloData?.descricao) {
      titulo = tituloData.descricao;
    }
  }

  return {
    ...player,
    titulo: titulo,
    nomeplayer: player.nome
  };
}

function savePlayerToStorage(playerData) {  
  const safeData = {
    nomeplayer: playerData.nome,
    classe: playerData.classe,
    level: playerData.level || 1,
    vida: playerData.vida || 0,
    maxvida: playerData.maxvida || 0,
    energia: playerData.energia || 0,
    ouro: playerData.ouro || 0,
    exp: playerData.exp || 0,
    forcaini: playerData.forcaini || 0,
    defesaini: playerData.defesaini || 0,
    inteligenciaini: playerData.inteligenciaini || 0,
    idclasse: playerData.idclasse,
    reputacao: playerData.reputacao || 0,
    infamia: playerData.infamia || 0,
    titulo: playerData.titulo || '-' // ✅ AGORA VAI VIR COM A DESCRIÇÃO
  };
  
  localStorage.setItem('playerData', JSON.stringify(safeData));
  return safeData;
}

async function ensurePlayerData() {
  // ✅ LIMPA o playerData velho e sempre busca do banco
  localStorage.removeItem('playerData');
  
  const idplayer = localStorage.getItem('idplayer');
  if (idplayer) {
    const dbPlayer = await fetchPlayerFromDB(idplayer);      
    return savePlayerToStorage(dbPlayer);
  }
  
  return null;
}

// ====================================================================
// 📈 Level Up, Missões, Eventos, Classes — SEM ALTERAÇÃO
// (mantidos exatamente como estavam)
// ====================================================================
async function fetchCurrentLevelFromXP(exp) {
  const { data, error } = await supabase
    .from('level_progression')
    .select('level')
    .lte('xp_required', exp)
    .order('level', { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return 1;
  return data.level;
}

async function verificarLevelUp() {
  const player = JSON.parse(localStorage.getItem('playerData'));
  if (!player) return false;
  const novoLevel = await fetchCurrentLevelFromXP(player.exp);
  const subiu = novoLevel > player.level;
  if (subiu) {
    const idplayer = localStorage.getItem('idplayer');
    await supabase
      .from('player')
      .update({
        level: novoLevel,
        vida: player.maxvida,
        energia: player.energia + 10
      })
      .eq('idplayer', idplayer);
    player.level = novoLevel;
    player.vida = player.maxvida;
    player.energia += 10;
    localStorage.setItem('playerData', JSON.stringify(player));
    return true;
  }
  return false;
}

async function updatePlayer(updates) {
  const idplayer = localStorage.getItem('idplayer');
  if (!idplayer) throw new Error('ID do jogador não encontrado.');
  const { error } = await supabase
    .from('player')
    .update(updates)
    .eq('idplayer', idplayer);
  if (error) throw error;
  const current = JSON.parse(localStorage.getItem('playerData')) || {};
  const updated = { ...current, ...updates };
  localStorage.setItem('playerData', JSON.stringify(updated));
}

async function registerUser(nomeusuario, email, senha) {
  if (!nomeusuario || !email || !senha) throw new Error('Preencha todos os campos.');
  const { data, error } = await supabase
    .from('usuario')
    .insert([{ nomeusuario, email, senha, data_cadastro: new Date().toISOString() }])
    .select('idusuario')
    .single();
  if (error) {
    if (error.message && error.message.includes('unique')) throw new Error('Usuário ou e-mail já existe.');
    throw error;
  }
  localStorage.setItem('idusuario', data.idusuario);
  localStorage.setItem('nomeusuario', nomeusuario);
  return data;
}

async function loginUser(nomeusuario, senha) {
  if (!nomeusuario || !senha) throw new Error('Preencha todos os campos.');
  const { data, error } = await supabase
    .from('usuario')
    .select('idusuario, nomeusuario')
    .eq('nomeusuario', nomeusuario)
    .eq('senha', senha)
    .single();
  if (error || !data) throw new Error('Usuário ou senha inválidos.');
  localStorage.setItem('idusuario', data.idusuario);
  localStorage.setItem('nomeusuario', data.nomeusuario);
  return data;
}

// ====================================================================
// 🔐 Criação de Personagem — COM TÍTULO INICIAL
// ====================================================================
async function createPlayer(nome, idclasse) {
  const idusuario = localStorage.getItem('idusuario');
  if (!idusuario) throw new Error('Sessão inválida.');

  const { data: cls, error: clsErr } = await supabase
    .from('classes')
    .select('nomeinicial, forcaini, defesaini, inteligenciaini')
    .eq('idclasse', idclasse)
    .single();
  if (clsErr) throw clsErr;

  // ✅ Busca o primeiro título da tabela "titulos"
  let idtitulofk = null;
  try {
    const { data: titulo, error: titErr } = await supabase
      .from('titulos')
      .select('idtitulo')
      .order('idtitulo', { ascending: true })
      .limit(1)
      .single();
    if (!titErr && titulo) idtitulofk = titulo.idtitulo;
  } catch (e) {
    console.warn('Não foi possível carregar título inicial:', e);
  }

  const novo = {
    nome,
    classe: cls.nomeinicial,
    level: 1,
    exp: 0,
    vida: 100,
    maxvida: 100,
    energia: 100,
    ouro: 0,
    reputacao: 0,
    infamia: 0,
    forcaini: cls.forcaini || 0,
    defesaini: cls.defesaini || 0,
    inteligenciaini: cls.inteligenciaini || 0,
    data_registro: new Date().toISOString(),
    idusuariofk: idusuario,
    idtitulofk // ✅ Agora definido corretamente
  };

  const { data, error } = await supabase
    .from('player')
    .insert([novo])
    .select()
    .single();
  if (error) {
    if (error.message && error.message.toLowerCase().includes('unique'))
      throw new Error('Você já tem um personagem com esse nome.');
    throw error;
  }

  const safeData = savePlayerToStorage(data);
  localStorage.setItem('idplayer', data.idplayer);
  localStorage.setItem('playerData', JSON.stringify(safeData));
  return data;
}

// ====================================================================
// 📚 Missões, Eventos, Classes — SEM ALTERAÇÃO
// ====================================================================
async function loadMissions() {
  const { data, error } = await supabase
    .from('missoes')
    .select('idmissao, descricao, levelrequired, xpconcedido, energiagasta, risco')
    .order('levelrequired', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function executeMission(mission, player) {
  const media = (player.forcaini + player.defesaini + player.inteligenciaini) / 3;
  const riscoOriginal = parseInt(mission.risco) || 50;
  const riscoEfetivo = Math.max(0, riscoOriginal - media);
  const isSuccess = Math.random() * 100 < (100 - riscoEfetivo);
  const novaEnergia = player.energia - mission.energiagasta;
  const novoExp = player.exp + (isSuccess ? mission.xpconcedido : 5);
  await updatePlayer({ energia: novaEnergia, exp: novoExp });
  const levelUp = await verificarLevelUp();
  return {
    success: isSuccess,
    xp: isSuccess ? mission.xpconcedido : 5,
    energiaGasta: mission.energiagasta,
    levelUp,
    riscoEfetivo: Math.round(riscoEfetivo)
  };
}

let _enemyEvents = [];
let _bonusEvents = [];
let _allNpcs = [];
let _allItems = [];

async function loadEvents() {
  const { data: enemy } = await supabase.from('eventosini').select('*');
  const { data: bonus } = await supabase.from('eventosbons').select('*');
  const { data: npcs } = await supabase.from('npc').select('idnpc, nomenpc');
  const { data: items } = await supabase.from('items').select('iditem, descricao');
  _enemyEvents = enemy || [];
  _bonusEvents = bonus || [];
  _allNpcs = npcs || [];
  _allItems = items || [];
}

async function explore(player) {
  if (player.energia < 10) throw new Error('Energia insuficiente para explorar.');
  const isEnemy = Math.random() < 0.7;
  if (isEnemy && _enemyEvents.length > 0) {
    const event = _enemyEvents[Math.floor(Math.random() * _enemyEvents.length)];
    return { type: 'enemy', event };
  } else if (!isEnemy && _bonusEvents.length > 0) {
    const event = _bonusEvents[Math.floor(Math.random() * _bonusEvents.length)];
    return { type: 'bonus', event };
  }
  throw new Error('Nenhum evento disponível.');
}

async function resolveEnemyEvent(player, event, willFight) {
  if (!willFight) {
    await updatePlayer({ energia: player.energia - 5 });
    return { type: 'flee', event };
  }
  const playerForce = player.forcaini || 10;
  const enemyForce = event.forcainimigo || 10;
  const baseChance = (playerForce / enemyForce) * 50 + 25;
  const chance = Math.min(95, Math.max(5, baseChance));
  const isSuccess = Math.random() * 100 < chance;
  const newExp = player.exp + (isSuccess ? event.xpsucess || 20 : 5);
  const newEnergia = player.energia - 10;
  const newVida = isSuccess ? player.vida : Math.max(0, player.vida - (event.vidatirada || 10));
  await updatePlayer({ exp: newExp, energia: newEnergia, vida: newVida });
  return {
    type: 'enemy-result',
    success: isSuccess,
    event,
    xp: isSuccess ? event.xpsucess || 20 : 5,
    vidaPerdida: isSuccess ? 0 : (event.vidatirada || 10)
  };
}

async function resolveBonusEvent(player, event) {
  const xp = event.xp || 15;
  const energia = event.energia || 10;
  await updatePlayer({ exp: player.exp + xp, energia: player.energia + energia });
  let bonusReward = null;
  if (Math.random() < 0.10 && _allNpcs.length > 0) {
    const randomNpc = _allNpcs[Math.floor(Math.random() * _allNpcs.length)];
    await supabase.from('player-npc').insert({ idplayer: localStorage.getItem('idplayer'), idnpc: randomNpc.idnpc });
    bonusReward = { type: 'npc', name: randomNpc.nomenpc };
  }
  if (!bonusReward && Math.random() < 0.30 && _allItems.length > 0) {
    const randomItem = _allItems[Math.floor(Math.random() * _allItems.length)];
    await supabase.from('player-item').insert({ idplayer: localStorage.getItem('idplayer'), iditem: randomItem.iditem });
    bonusReward = { type: 'item', name: randomItem.descricao };
  }
  return {
    type: 'bonus-result',
    event,
    xp,
    energia,
    bonusReward
  };
}

async function loadClasses() {
  const { data, error } = await supabase
    .from('classes')
    .select('idclasse, nomeinicial')
    .order('nomeinicial');
  if (error) throw error;
  return data || [];
}

// ====================================================================
// 🗂️ Footer, Inventário, Dormir — ATUALIZADO PARA USAR isValidUserId
// ====================================================================
async function fetchFooterData() {
  const idplayer = localStorage.getItem('idplayer');
  if (!idplayer) throw new Error('ID do jogador não encontrado.');
  const { data: player, error: playerErr } = await supabase
    .from('player')
    .select('level')
    .eq('idplayer', idplayer)
    .single();
  if (playerErr) throw playerErr;
  const { data: npcs } = await supabase
    .from('player-npc')
    .select('npc(nomenpc)')
    .eq('idplayer', idplayer);
  const { data: armas } = await supabase
    .from('player-arma')
    .select('equiped, armas(descricao)')
    .eq('idplayer', idplayer);
  const { data: items } = await supabase
    .from('player-item')
    .select('items(descricao)')
    .eq('idplayer', idplayer);
  return {
    player,
    npcs: npcs || [],
    armas: armas || [],
    itens: items || []
  };
}

async function atualizarFooter() {
  try {
    const data = await fetchFooterData();
    document.getElementById('footer-level').textContent = data.player.level || '-';
    const npcList = document.getElementById('footer-npcs-list');
    npcList.innerHTML = data.npcs.length > 0
      ? data.npcs.map(n => `<li>${n.npc?.nomenpc || 'NPC sem nome'}</li>`).join('')
      : '<li class="empty">Nenhum aliado</li>';
    const armasList = document.getElementById('footer-armas-list');
    armasList.innerHTML = data.armas.length > 0
      ? data.armas.map(a => `<li>${a.armas?.descricao || 'Arma desconhecida'}</li>`).join('')
      : '<li class="empty">Nenhuma arma</li>';
    const itensList = document.getElementById('footer-itens-list');
    itensList.innerHTML = data.itens.length > 0
      ? data.itens.map(i => `<li>${i.items?.descricao || 'Item desconhecido'}</li>`).join('')
      : '<li class="empty">Nenhum item</li>';
  } catch (err) {
    console.error('Erro ao atualizar footer:', err);
    document.getElementById('footer-npcs-list').innerHTML = '<li class="empty">Erro</li>';
    document.getElementById('footer-armas-list').innerHTML = '<li class="empty">Erro</li>';
    document.getElementById('footer-itens-list').innerHTML = '<li class="empty">Erro</li>';
  }
}

async function fetchInventoryData() {
  const idplayer = localStorage.getItem('idplayer');
  if (!idplayer) throw new Error('ID do jogador não encontrado.');
  const { data: player } = await supabase
    .from('player')
    .select('nome, classe, idclasse')
    .eq('idplayer', idplayer)
    .single();
  const { data: arma } = await supabase
    .from('player-arma')
    .select('idarma, equiped, armas(descricao, dano)')
    .eq('idplayer', idplayer);
  const { data: items } = await supabase
    .from('player-item')
    .select('iditem, items(descricao, qtadevida, energia)')
    .eq('idplayer', idplayer);
  const { data: vestimentas } = await supabase
    .from('player-vestimenta')
    .select('idvestimenta, equiped, vestimentas(descricao, defesa, maxvida)')
    .eq('idplayer', idplayer);
  const { data: npc } = await supabase
    .from('player-npc')
    .select('idnpc, npc(nomenpc, gennpc)')
    .eq('idplayer', idplayer);
  return {
    player,
    armas: arma || [],
    vestimentas: vestimentas || [],
    itens: items || [],
    npcs: npc || []
  };
}

async function useItem(itemId) {
  const idplayer = localStorage.getItem('idplayer');
  if (!idplayer) throw new Error('Jogador não autenticado.');
  const { data: item, error } = await supabase
    .from('items')
    .select('qtadevida, energia')
    .eq('iditem', itemId)
    .single();
  if (error) throw error;
  const player = JSON.parse(localStorage.getItem('playerData')) || {};
  const updates = {};
  if (item.qtadevida) updates.vida = Math.min(player.maxvida, (player.vida || 0) + item.qtadevida);
  if (item.energia) updates.energia = (player.energia || 0) + item.energia;
  await updatePlayer(updates);
  await supabase
    .from('player-item')
    .delete()
    .eq('idplayer', idplayer)
    .eq('iditem', itemId);
  return updates;
}

// ✅ CORRIGIDO: usa isValidUserId
async function equipWeapon(armaId) {
  const idplayer = localStorage.getItem('idplayer');
  if (!idplayer || !isValidUserId(idplayer)) throw new Error('ID do jogador inválido.');
  if (!armaId || !isValidUserId(armaId)) throw new Error('ID da arma inválido.');
  const { data: arma, error: armaErr } = await supabase
    .from('armas')
    .select('dano')
    .eq('idarma', armaId)
    .single();
  if (armaErr) throw armaErr;
  const player = JSON.parse(localStorage.getItem('playerData')) || {};
  const forcainiAtual = player.forcaini || 0;
  const bonus = arma.dano || 0;
  const novoForcaini = forcainiAtual + bonus;
  await updatePlayer({ forcaini: novoForcaini });
  const { data: relacao } = await supabase
    .from('player-arma')
    .select('idrelacao')
    .eq('idplayer', idplayer)
    .eq('idarma', armaId)
    .single();
  if (relacao) {
    await supabase
      .from('player-arma')
      .update({ equiped: true })
      .eq('idrelacao', relacao.idrelacao);
  } else {
    await supabase
      .from('player-arma')
      .insert({ idplayer, idarma: armaId, equiped: true });
  }
  return { success: true };
}

async function unequipWeapon() {
  const idplayer = localStorage.getItem('idplayer');
  if (!idplayer) throw new Error('Jogador não autenticado.');
  const { data: armaEquipada } = await supabase
    .from('player-arma')
    .select('idarma, armas(dano)')
    .eq('idplayer', idplayer)
    .eq('equiped', true)
    .single();
  if (!armaEquipada) {
    await supabase
      .from('player-arma')
      .update({ equiped: false })
      .eq('idplayer', idplayer);
    return { success: true };
  }
  const bonus = armaEquipada.armas?.dano || 0;
  const player = JSON.parse(localStorage.getItem('playerData')) || {};
  const forcainiAtual = player.forcaini || 0;
  const novoForcaini = Math.max(0, forcainiAtual - bonus);
  await updatePlayer({ forcaini: novoForcaini });
  await supabase
    .from('player-arma')
    .update({ equiped: false })
    .eq('idplayer', idplayer)
    .eq('idarma', armaEquipada.idarma);
  return { success: true };
}

// ✅ CORRIGIDO: usa isValidUserId
async function equipVestimenta(vestId) {
  const idplayer = localStorage.getItem('idplayer');
  if (!idplayer || !isValidUserId(idplayer)) throw new Error('ID do jogador inválido.');
  if (!vestId || !isValidUserId(vestId)) throw new Error('ID da vestimenta inválido.');
  const { data: vest, error: vestErr } = await supabase
    .from('vestimentas')
    .select('defesa, maxvida')
    .eq('idvisual', vestId)
    .single();
  if (vestErr) throw vestErr;
  const player = JSON.parse(localStorage.getItem('playerData')) || {};
  const defesaAtual = player.defesaini || 0;
  const maxvidaAtual = player.maxvida || 100;
  const novaDefesa = defesaAtual + (vest.defesa || 0);
  const novaMaxVida = maxvidaAtual + (vest.maxvida || 0);
  const novaVida = Math.min(player.vida || 0, novaMaxVida);
  await updatePlayer({
    defesaini: novaDefesa,
    maxvida: novaMaxVida,
    vida: novaVida
  });
  const { data: relacao } = await supabase
    .from('player-vestimenta')
    .select('idrelacao')
    .eq('idplayer', idplayer)
    .eq('idvestimenta', vestId)
    .single();
  if (relacao) {
    await supabase
      .from('player-vestimenta')
      .update({ equiped: true })
      .eq('idrelacao', relacao.idrelacao);
  } else {
    await supabase
      .from('player-vestimenta')
      .insert({ idplayer, idvestimenta: vestId, equiped: true });
  }
  return { success: true };
}

async function unequipVestimenta() {
  const idplayer = localStorage.getItem('idplayer');
  if (!idplayer) throw new Error('Jogador não autenticado.');
  const { data: vestEquipada } = await supabase
    .from('player-vestimenta')
    .select('idvestimenta, vestimentas(defesa, maxvida)')
    .eq('idplayer', idplayer)
    .eq('equiped', true)
    .single();
  if (!vestEquipada) {
    await supabase
      .from('player-vestimenta')
      .update({ equiped: false })
      .eq('idplayer', idplayer);
    return { success: true };
  }
  const bonusDefesa = vestEquipada.vestimentas?.defesa || 0;
  const bonusMaxVida = vestEquipada.vestimentas?.maxvida || 0;
  const player = JSON.parse(localStorage.getItem('playerData')) || {};
  const defesaAtual = player.defesaini || 0;
  const maxvidaAtual = player.maxvida || 100;
  const novaDefesa = Math.max(0, defesaAtual - bonusDefesa);
  const novaMaxVida = Math.max(1, maxvidaAtual - bonusMaxVida);
  const novaVida = Math.min(player.vida || 0, novaMaxVida);
  await updatePlayer({
    defesaini: novaDefesa,
    maxvida: novaMaxVida,
    vida: novaVida
  });
  await supabase
    .from('player-vestimenta')
    .update({ equiped: false })
    .eq('idplayer', idplayer)
    .eq('idvestimenta', vestEquipada.idvestimenta);
  return { success: true };
}

async function handleNpcAction(npcId, action) {
  const idplayer = localStorage.getItem('idplayer');
  if (!idplayer || !npcId) throw new Error('Dados inválidos.');
  await supabase
    .from('player-npc')
    .delete()
    .eq('idplayer', idplayer)
    .eq('idnpc', npcId);
  if (action === 'encaminhar') {
    const player = JSON.parse(localStorage.getItem('playerData')) || {};
    await updatePlayer({ exp: (player.exp || 0) + 20 });
    await verificarLevelUp();
  } else if (action === 'expulsar') {
    const { data: currentPlayer } = await supabase
      .from('player')
      .select('infamia')
      .eq('idplayer', idplayer)
      .single();
    const novaInfamia = (currentPlayer?.infamia || 0) + 20;
    await updatePlayer({ infamia: novaInfamia });
  }
  return { success: true };
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function dormir() {
  const idplayer = localStorage.getItem('idplayer');
  if (!idplayer) throw new Error('Jogador não autenticado.');
  const player = JSON.parse(localStorage.getItem('playerData')) || {};
  const updates = {    
    vida: player.maxvida || 100,
    energia: 100
  };
  await updatePlayer(updates);
  return updates;
}

// ====================================================================
// 🌐 Exportação
// ====================================================================
window.GAME = {
  config: GAME_CONFIG,
  supabase,
  requireAuth,
  logout,
  isValidUserId, // ✅ Exporta a versão correta
  ensurePlayerData,
  savePlayerToStorage,
  fetchPlayerFromDB,
  updatePlayer,
  loadMissions,
  executeMission,
  loadClasses,
  loadEvents,
  explore,
  resolveEnemyEvent,
  resolveBonusEvent,
  atualizarFooter,
  fetchFooterData,
  fetchInventoryData,
  escapeHtml,
  useItem,
  equipWeapon,
  unequipWeapon,
  equipVestimenta,
  unequipVestimenta,
  handleNpcAction,
  registerUser,
  loginUser,
  createPlayer,
  dormir
};