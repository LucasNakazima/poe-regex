const urlReq = 'https://api.poe.watch/';

async function buscarLiga() {
  const ignorar = ['Standard', 'Hardcore', 'Solo', 'Ruthless'];
  try {
    let result = await axios.get(urlReq + 'leagues');
    let leagues = result.data;
    return leagues.find(e => !ignorar.some(palavra => e.name.includes(palavra)));
  } catch (error) {
    console.error("Erro ao buscar ligas:", error);
    return null;
  }
}

async function buscarItens(liga, categoria) {
  try {
    let result = await axios.get(urlReq + `get?league=${liga}&category=${categoria}`);
    return result.data;
  } catch (error) {
    console.error("Erro ao buscar itens:", error);
    return null;
  }
}

function encontrarAssinatura(nomeAlvo, listaFiltrada) {
    const nome = nomeAlvo.toLowerCase().replace(/[,']/g, '');
    const outrosNomes = listaFiltrada
        .map(n => n.toLowerCase().replace(/[,']/g, ''))
        .filter(n => n !== nome);

    // Tenta achar um pedaço de 3 letras, depois 4, etc.
    for (let tamanho = 3; tamanho <= 10; tamanho++) {
        for (let i = 0; i <= nome.length - tamanho; i++) {
            let pedaco = nome.substring(i, i + tamanho);
            
            // Se esse pedaço não existe em nenhum outro bicho da lista filtrada...
            if (!outrosNomes.some(outro => outro.includes(pedaco))) {
                return pedaco; // Retorna o menor pedaço único
            }
        }
    }
    return nome.slice(0, 8); // Fallback caso não ache nada curto
}

function gerarBestiaryRegex(lista, limiteChar = 250) {
    // 1. Geramos as assinaturas baseadas na lista atual (já filtrada por chaos)
    const assinaturas = lista.map(nome => encontrarAssinatura(nome, lista));

    let lotes = [];
    let atual = [];
    let comprimento = 0;

    assinaturas.forEach(sig => {
        // O custo é o tamanho da assinatura + 1 (da barra '|')
        const custo = atual.length === 0 ? sig.length : sig.length + 1;

        if (comprimento + custo > limiteChar) {
            lotes.push(atual.join('|'));
            atual = [sig];
            comprimento = sig.length;
        } else {
            atual.push(sig);
            comprimento += custo;
        }
    });

    if (atual.length > 0) lotes.push(atual.join('|'));
    return lotes;
}

function renderizarInterface(bestas) {
    // 1. Criamos um array só com os nomes para as funções de Regex funcionarem
    const listaNomes = bestas.map(b => b.name);

    // 2. Gerar os lotes de 250 chars (Passando a lista de nomes)
    const lotes = gerarBestiaryRegex(listaNomes);

    const blocksDiv = document.getElementById('regex-blocks');
    blocksDiv.innerHTML = '<h3>Blocos de Busca (Até 250 chars)</h3>';

    lotes.forEach((txt, i) => {
        const div = document.createElement('div');
        div.className = 'block-container';
        div.innerHTML = `
            <button class="copy-btn" onclick="navigator.clipboard.writeText('${txt}')">Copiar Bloco</button>
            <strong>Bloco ${i + 1}:</strong><br>
            <span style="color: #88ff88; font-family: monospace;">${txt}</span>
        `;
        blocksDiv.appendChild(div);
    });

    // 3. Renderizar a Tabela
    const tbody = document.getElementById('bestiary-body');
    tbody.innerHTML = ''; 

    bestas.forEach((besta) => {
        // CORREÇÃO AQUI: Passamos o nome da besta e a lista de NOMES (não de objetos)
        const idUnico = encontrarAssinatura(besta.name, listaNomes);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${besta.icon}" class="beast-icon"></td>
            <td style="color: #4db8ff;">${besta.name}</td>
            <td><span class="regex-badge" title="Clique para copiar" onclick="navigator.clipboard.writeText('${idUnico}')">${idUnico}</span></td>
            <td style="color: #ffd700;">
                ${besta.history?.[0] ? besta.history?.[0].toFixed(1) : 0} 
            </td>
        `;
        tbody.appendChild(tr);
    });
}

let todasAsBestasCache = [];

async function main() {
  console.log('Iniciando...');

  const liga = await buscarLiga();
  if (!liga) return console.log('Erro na liga');

  const itens = await buscarItens(liga.name, 'beast');
  if (!itens) return console.log('Erro nos itens');

  todasAsBestasCache = itens.sort((a, b) => (b.history?.[0] || 0) - (a.history?.[0] || 0));

  document.getElementById('min-chaos').addEventListener('blur', executarFiltro);

  executarFiltro();
}

function executarFiltro() {
  const minChaos = parseInt(document.getElementById('min-chaos').value) || 0;

  const itensFiltrados = todasAsBestasCache.filter(item => (item.history?.[0] || 0) >= minChaos);

  document.getElementById('regex-blocks').innerHTML = '';
  document.getElementById('bestiary-body').innerHTML = '';

  if (itensFiltrados.length === 0) {
    document.getElementById('bestiary-body').innerHTML = '<tr><td colspan="4">Nenhuma besta encontrada com esse valor.</td></tr>';
    return;
  }

  renderizarInterface(itensFiltrados);
  console.log(`Filtro aplicado: ${itensFiltrados.length} bestas acima de ${minChaos}c`);
}
main();