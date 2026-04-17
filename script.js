// CONFIGURAÇÃO FIREBASE CORRIGIDA
const firebaseConfig = {
    apiKey: "AIzaSyBdPMuVdJ7L0lyX_pEfVSDLOWeyiUb3rQ8",
    authDomain: "://firebaseapp.com",
    databaseURL: "https://firebaseio.com",
    projectId: "gtec-gastos",
    storageBucket: "gtec-gastos.firebasestorage.app",
    messagingSenderId: "22350153282",
    appId: "1:22350153282:web:bf66c5a51265f54cdbcfdb"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();


// VARIÁVEIS GLOBAIS
window.limiteGlobal = 1000;
let gastosRealizados = [];
let custosFixos = [];
let ciclosEncerrados = [];
let percentualAlerta = parseFloat(localStorage.getItem("percentualAlerta")) || 80;

let meuNome = localStorage.getItem("nomeUsuario") || prompt("Identifique este celular (Ex: POCO 01):") || "USER";
localStorage.setItem("nomeUsuario", meuNome);

// SINCRONIZAÇÃO EM TEMPO REAL
db.ref('/').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        limiteGlobal = data.limiteGlobal || 1000;
        gastosRealizados = data.gastosRealizados ? Object.values(data.gastosRealizados).reverse() : [];
        custosFixos = data.custosFixos ? Object.values(data.custosFixos) : [];
        ciclosEncerrados = data.ciclosEncerrados ? Object.values(data.ciclosEncerrados) : [];
        atualizarDashboard();
        if (document.getElementById("paginaFixos").style.display === "block") renderizarFixos();
        if (document.getElementById("paginaRelatorios").style.display === "block") renderizarRelatorios();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("displayID").textContent = "ID: " + (Math.floor(100000 + Math.random()*900000));
    document.getElementById("displayUser").textContent = "USER: " + meuNome.toUpperCase();
});

function atualizarDashboard() {
    const totalGasto = gastosRealizados.reduce((acc, item) => acc + item.valor, 0);
    const saldo = limiteGlobal - totalGasto;
    const porcentagem = (totalGasto / limiteGlobal) * 100;

    const elSaldo = document.getElementById("valSaldo");
    elSaldo.textContent = "R$ " + saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2});
    
    const barra = document.getElementById("barraProgresso");
    if (barra) {
        barra.style.width = Math.min(porcentagem, 100) + "%";
        // ALERTA DE LIMITE CONFIGURÁVEL
        barra.style.backgroundColor = porcentagem >= percentualAlerta ? "#ff3b30" : "#ffffff";
    }

    document.getElementById("labelGasto").textContent = "GASTO: R$ " + totalGasto.toLocaleString('pt-BR', {minimumFractionDigits: 2});
    document.getElementById("labelLimite").textContent = "LIMITE: R$ " + limiteGlobal.toLocaleString('pt-BR', {minimumFractionDigits: 2});

    renderizarHistorico();
}

function adicionarGasto() {
    const desc = document.getElementById("descGasto").value;
    const valor = parseFloat(document.getElementById("valorGasto").value);
    if (!desc || isNaN(valor)) return alert("Preencha corretamente");

    const novoGasto = {
        id: Date.now(),
        desc: desc.toUpperCase(),
        valor: valor,
        quem: meuNome.toUpperCase(),
        data: new Date().toLocaleDateString('pt-BR') + " " + new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})
    };

    db.ref('gastosRealizados/' + novoGasto.id).set(novoGasto);
    
    document.getElementById("descGasto").value = "";
    document.getElementById("valorGasto").value = "";
    mostrarTela('paginaHome');
}

function excluirGasto(id) {
    if (confirm("Deseja apagar este gasto?")) {
        db.ref('gastosRealizados/' + id).remove();
    }
}

function configurarLimite() {
    // Usamos window.limiteGlobal para garantir que o sistema ache o valor
    const valorAtual = window.limiteGlobal || 1000;
    const novo = prompt("Qual o novo valor limite?", valorAtual);
    
    if (novo !== null && !isNaN(parseFloat(novo))) {
        const novoValor = parseFloat(novo);
        
        // Salva no Firebase (Sincroniza os dois celulares)
        db.ref('limiteGlobal').set(novoValor);
        
        const alerta = prompt("Com quantos % de uso deseja que a barra fique vermelha?", percentualAlerta);
        if (alerta !== null && !isNaN(parseFloat(alerta))) {
            percentualAlerta = parseFloat(alerta);
            localStorage.setItem("percentualAlerta", percentualAlerta);
        }
        
        alert("Limite atualizado com sucesso!");
    }
}



function renderizarHistorico() {
    const ul = document.getElementById("listaGastos");
    ul.innerHTML = gastosRealizados.map(g => `
        <li>
            <div style="flex: 1;">
                <strong style="color: #fff;">${g.desc}</strong><br>
                <small style="color: #444; font-size: 9px; font-weight: 800;">${g.data} | POR: ${g.quem}</small>
            </div>
            <div style="text-align: right; display: flex; align-items: center; gap: 15px;">
                <span style="color: #ff3b30; font-weight: bold; font-size: 14px;">- R$ ${g.valor.toFixed(2)}</span>
                <span onclick="excluirGasto(${g.id})" style="cursor: pointer; color: #444; font-weight: 800; font-size: 10px;">EXCLUIR</span>
            </div>
        </li>
    `).join('');
}

function adicionarFixo() {
    const desc = document.getElementById("descFixo").value;
    const valor = parseFloat(document.getElementById("valorFixo").value);
    if (!desc || isNaN(valor)) return alert("Preencha corretamente");

    const novoFixo = { id: Date.now(), desc: desc.toUpperCase(), valor: valor };
    db.ref('custosFixos/' + novoFixo.id).set(novoFixo);

    document.getElementById("descFixo").value = "";
    document.getElementById("valorFixo").value = "";
}

function renderizarFixos() {
    const ul = document.getElementById("listaFixos");
    ul.innerHTML = custosFixos.map(f => {
        const jaLancado = gastosRealizados.some(g => g.desc === f.desc + " (FIXO)");
        const statusBtn = jaLancado 
            ? `<span style="color:#4cd964; font-weight: 800;">LANÇADO</span>`
            : `<span onclick="lancarFixoIndividual('${f.id}')" style="color:#fff; border: 1px solid #fff; padding: 3px 6px; border-radius:4px;">LANÇAR</span>`;

        return `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0;">
                <div style="flex: 1;"><strong style="color:#fff;">${f.desc}</strong><br><small>R$ ${f.valor.toFixed(2)}</small></div>
                <div style="display:flex; gap:12px; font-weight: 800; font-size: 10px; align-items: center;">
                    ${statusBtn}
                    <span onclick="db.ref('custosFixos/${f.id}').remove()" style="color:#ff3b30; cursor:pointer;">EXCLUIR</span>
                </div>
            </li>
        `;
    }).join('');
}

function lancarFixoIndividual(id) {
    const item = custosFixos.find(f => f.id == id);
    const novo = {
        id: Date.now(),
        desc: item.desc + " (FIXO)",
        valor: item.valor,
        quem: meuNome.toUpperCase(),
        data: new Date().toLocaleDateString('pt-BR') + " " + new Date().toLocaleTimeString('pt-BR')
    };
    db.ref('gastosRealizados/' + novo.id).set(novo);
}

function encerrarCiclo() {
    const nome = prompt("Nome do Ciclo (Ex: Maio/24):");
    if (!nome || !confirm("Isso arquivará os gastos e iniciará o próximo ciclo. Confirma?")) return;

    const total = gastosRealizados.reduce((acc, i) => acc + i.valor, 0);
    const relatorio = { nome: nome.toUpperCase(), total: total, limite: limiteGlobal, data: new Date().toLocaleDateString('pt-BR') };
    
    db.ref('ciclosEncerrados/' + Date.now()).set(relatorio);
    db.ref('gastosRealizados').remove();
    
    // Auto-lança os fixos para o novo mês
    custosFixos.forEach(f => {
        const novo = { id: Date.now()+Math.random(), desc: f.desc+" (FIXO)", valor: f.valor, quem: "SISTEMA", data: new Date().toLocaleDateString('pt-BR') };
        db.ref('gastosRealizados/' + novo.id).set(novo);
    });
    alert("Ciclo encerrado!");
}

function renderizarRelatorios() {
    const ul = document.getElementById("listaRelatorios");
    ul.innerHTML = ciclosEncerrados.map(c => `
        <li style="display: block; border: 1px solid #111; padding: 15px; margin-bottom:10px; border-radius:10px;">
            <div style="display:flex; justify-content:space-between;"><strong>${c.nome}</strong><small>${c.data}</small></div>
            <div style="font-size:12px; margin-top:5px;">TOTAL: R$ ${c.total.toFixed(2)} | LIMITE: R$ ${c.limite.toFixed(2)}</div>
        </li>
    `).join('');
}

function mostrarTela(id) {
    ["paginaHome", "paginaLancamento", "paginaRelatorios", "paginaFixos"].forEach(s => {
        document.getElementById(s).style.display = (s === id) ? "block" : "none";
    });
    document.getElementById("btnVoltar").style.display = (id === "paginaHome") ? "none" : "block";
    if (id === 'paginaFixos') renderizarFixos();
    if (id === 'paginaRelatorios') renderizarRelatorios();
}

function voltarTela() { mostrarTela("paginaHome"); }
function irParaHome() { mostrarTela("paginaHome"); }
