// ================= CONFIGURAÇÃO FIREBASE =================
const firebaseConfig = {
    apiKey: "AIzaSyBdPMuVdJ7L0lyX_pEfVSDLOWeyiUb3rQ8",
    authDomain: "gtec-gastos.firebaseapp.com",
    databaseURL: "https://gtec-gastos-default-rtdb.firebaseio.com/",
    projectId: "gtec-gastos",
    storageBucket: "gtec-gastos.firebasestorage.app",
    messagingSenderId: "22350153282",
    appId: "1:22350153282:web:bf66c5a51265f54cdbcfdb"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

db.ref('teste').set({
    funcionando: true,
    data: new Date().toString()
});

// ================= VARIÁVEIS =================
let limiteGlobal = 1000;
let gastosRealizados = [];
let custosFixos = [];
let ciclosEncerrados = [];
let percentualAlerta = parseFloat(localStorage.getItem("percentualAlerta")) || 80;

let meuNome = localStorage.getItem("nomeUsuario") || prompt("Identifique este celular (Ex: POCO 01):") || "USER";
localStorage.setItem("nomeUsuario", meuNome);

// ================= SINCRONIZAÇÃO =================
db.ref('/').on('value', (snapshot) => {
    const data = snapshot.val();

    if (data) {
        limiteGlobal = data.limiteGlobal || 1000;
        gastosRealizados = data.gastosRealizados ? Object.values(data.gastosRealizados) : [];
        gastosRealizados.sort((a,b) => b.id - a.id);
        custosFixos = data.custosFixos ? Object.values(data.custosFixos) : [];
        ciclosEncerrados = data.ciclosEncerrados ? Object.values(data.ciclosEncerrados) : [];

        atualizarDashboard();

        if (document.getElementById("paginaFixos").style.display === "block") renderizarFixos();
        if (document.getElementById("paginaRelatorios").style.display === "block") renderizarRelatorios();
    }
});

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    let deviceID = localStorage.getItem("deviceID");

    if (!deviceID) {
        deviceID = Math.floor(100000 + Math.random()*900000);
        localStorage.setItem("deviceID", deviceID);
    }

    document.getElementById("displayID").textContent = "ID: " + deviceID;
    document.getElementById("displayUser").textContent = "USER: " + meuNome.toUpperCase();
});

// ================= DASHBOARD =================
function atualizarDashboard() {
    const totalGasto = gastosRealizados.reduce((acc, item) => acc + item.valor, 0);
    const saldo = limiteGlobal - totalGasto;
    const porcentagem = limiteGlobal > 0 ? (totalGasto / limiteGlobal) * 100 : 0;

    document.getElementById("valSaldo").textContent =
        "R$ " + saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2});

    const barra = document.getElementById("barraProgresso");

    if (barra) {
        barra.style.width = Math.min(porcentagem, 100) + "%";
        barra.style.backgroundColor = porcentagem >= percentualAlerta ? "#ff3b30" : "#ffffff";
    }

    document.getElementById("labelGasto").textContent =
        "GASTO: R$ " + totalGasto.toLocaleString('pt-BR', {minimumFractionDigits: 2});

    document.getElementById("labelLimite").textContent =
        "LIMITE: R$ " + limiteGlobal.toLocaleString('pt-BR', {minimumFractionDigits: 2});

    renderizarHistorico();
}

// ================= GASTOS =================
function adicionarGasto() {
    const desc = document.getElementById("descGasto").value;
    const valor = parseFloat(document.getElementById("valorGasto").value);

    if (!desc || isNaN(valor)) return alert("Preencha corretamente");

    const novoGasto = {
        id: Date.now(),
        desc: desc.toUpperCase(),
        valor: valor,
        quem: meuNome.toUpperCase(),
        data: new Date().toLocaleDateString('pt-BR') + " " +
              new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})
    };

    db.ref('gastosRealizados/' + novoGasto.id).set(novoGasto);

    document.getElementById("descGasto").value = "";
    document.getElementById("valorGasto").value = "";

    mostrarTela('paginaHome');
    alert("Gasto lançado com sucesso");
}

// ================= HISTÓRICO =================
function renderizarHistorico() {
    const ul = document.getElementById("listaGastos");

    ul.innerHTML = gastosRealizados.map(g => `
        <li>
            <div style="flex: 1;">
                <strong style="color: #fff;">${g.desc}</strong><br>
                <small style="color: #444; font-size: 9px; font-weight: 800;">
                    ${g.data} | POR: ${g.quem}
                </small>
            </div>
            <div style="text-align: right; display: flex; align-items: center; gap: 15px;">
                <span style="color: #ff3b30; font-weight: bold; font-size: 14px;">
                    - R$ ${g.valor.toFixed(2)}
                </span>
                <span onclick="excluirGasto(${g.id})"
                      style="cursor: pointer; color: #444; font-weight: 800; font-size: 10px;">
                    EXCLUIR
                </span>
            </div>
        </li>
    `).join('');
}

// ================= RESTANTE =================
// (não alterei lógica — só formatação)