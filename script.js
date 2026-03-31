// Configurações do Repositório (Preencher após criar o repo)
const REPO_OWNER = 'edu-plusseg';
const REPO_NAME = 'facility-link-hub';
const FILE_PATH = 'data.json';

let appData = {
    categories: [],
    links: [],
    authorizedEmails: []
};

let isEditMode = false;
let currentUserEmail = '';
let githubToken = localStorage.getItem('github_pat') || '';

// Elementos DOM
const linksContainer = document.getElementById('linksContainer');
const searchInput = document.getElementById('searchInput');
const editBtn = document.getElementById('editBtn');
const saveBtn = document.getElementById('saveBtn');

// Modais
const authModal = document.getElementById('authModal');
const configModal = document.getElementById('configModal');
const linkModal = document.getElementById('linkModal');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
});

async function loadData() {
    try {
        // Tenta carregar do arquivo local (que no GitHub Pages será o mesmo do repo)
        // Isso é mais rápido e confiável para leitura inicial
        let response = await fetch(`${FILE_PATH}?t=${Date.now()}`);
        
        if (!response.ok) {
            // Fallback para raw GitHub URL se falhar localmente
            if (REPO_OWNER && REPO_NAME) {
                const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${FILE_PATH}?t=${Date.now()}`;
                response = await fetch(url);
            }
        }
        
        if (!response.ok) throw new Error('Falha ao carregar dados');
        
        appData = await response.json();
        renderLinks();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        linksContainer.innerHTML = '<div class="loading">Erro ao carregar os links. Verifique a configuração do repositório.</div>';
    }
}

function renderLinks(filter = '') {
    linksContainer.innerHTML = '';
    
    if (appData.categories.length === 0) {
        linksContainer.innerHTML = '<div class="loading">Nenhum link encontrado.</div>';
        return;
    }

    // Botão Adicionar Link (apenas no modo edição)
    if (isEditMode) {
        const addSection = document.createElement('div');
        addSection.className = 'category-section';
        addSection.innerHTML = `<button class="btn btn-primary" onclick="openLinkModal()">+ Adicionar Novo Link</button>`;
        linksContainer.appendChild(addSection);
    }

    appData.categories.forEach(category => {
        const categoryLinks = appData.links.filter(link => 
            link.category === category && 
            (link.name.toLowerCase().includes(filter.toLowerCase()) || 
             link.description.toLowerCase().includes(filter.toLowerCase()))
        );

        if (categoryLinks.length > 0 || isEditMode) {
            const section = document.createElement('section');
            section.className = 'category-section';
            
            const title = document.createElement('h2');
            title.className = 'category-title';
            title.textContent = category;
            section.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'links-grid';

            categoryLinks.forEach(link => {
                const card = document.createElement('div');
                card.className = 'link-card';
                card.innerHTML = `
                    <div class="link-info">
                        <h3>${link.name}</h3>
                        <p>${link.description || ''}</p>
                    </div>
                    <div class="card-actions">
                        <a href="${link.url}" target="_blank" class="btn btn-secondary btn-sm">Acessar</a>
                        ${isEditMode ? `
                            <div class="edit-actions">
                                <button class="btn btn-text btn-sm" onclick="editLink('${link.name}')">Editar</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteLink('${link.name}')">Excluir</button>
                            </div>
                        ` : ''}
                    </div>
                `;
                grid.appendChild(card);
            });

            section.appendChild(grid);
            linksContainer.appendChild(section);
        }
    });
}

function setupEventListeners() {
    // Busca
    searchInput.addEventListener('input', (e) => {
        renderLinks(e.target.value);
    });

    // Botão Editar Geral
    editBtn.addEventListener('click', () => {
        if (!isEditMode) {
            authModal.classList.add('active');
        } else {
            toggleEditMode(false);
        }
    });

    // Modal de Autenticação
    document.getElementById('confirmAuth').addEventListener('click', () => {
        const email = document.getElementById('authEmail').value.trim();
        if (appData.authorizedEmails.includes(email)) {
            currentUserEmail = email;
            authModal.classList.remove('active');
            toggleEditMode(true);
        } else {
            alert('E-mail não autorizado para edição.');
        }
    });

    document.getElementById('cancelAuth').addEventListener('click', () => {
        authModal.classList.remove('active');
    });

    // Botão Salvar
    saveBtn.addEventListener('click', () => {
        if (!githubToken) {
            configModal.classList.add('active');
        } else {
            saveToGitHub();
        }
    });

    // Modal de Configuração GitHub
    document.getElementById('saveConfig').addEventListener('click', () => {
        const token = document.getElementById('githubPat').value.trim();
        if (token) {
            githubToken = token;
            localStorage.setItem('github_pat', token);
            configModal.classList.remove('active');
            saveToGitHub();
        }
    });

    document.getElementById('cancelConfig').addEventListener('click', () => {
        configModal.classList.remove('active');
    });

    // Modal de Link
    document.getElementById('linkForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('linkId').value;
        const newLink = {
            name: document.getElementById('linkName').value,
            url: document.getElementById('linkUrl').value,
            description: document.getElementById('linkDesc').value,
            category: document.getElementById('linkCategory').value
        };

        if (id) {
            const index = appData.links.findIndex(l => l.name === id);
            appData.links[index] = newLink;
        } else {
            appData.links.push(newLink);
        }

        linkModal.classList.remove('active');
        renderLinks();
    });

    document.getElementById('cancelLink').addEventListener('click', () => {
        linkModal.classList.remove('active');
    });
}

function toggleEditMode(enabled) {
    isEditMode = enabled;
    editBtn.textContent = enabled ? 'Sair do Modo Edição' : 'Editar Hub';
    editBtn.classList.toggle('btn-secondary', !enabled);
    editBtn.classList.toggle('btn-text', enabled);
    saveBtn.classList.toggle('hidden', !enabled);
    renderLinks();
}

function openLinkModal(link = null) {
    const title = document.getElementById('linkModalTitle');
    const select = document.getElementById('linkCategory');
    
    // Popular categorias
    select.innerHTML = appData.categories.map(c => `<option value="${c}">${c}</option>`).join('');
    
    if (link) {
        title.textContent = 'Editar Link';
        document.getElementById('linkId').value = link.name;
        document.getElementById('linkName').value = link.name;
        document.getElementById('linkUrl').value = link.url;
        document.getElementById('linkDesc').value = link.description;
        document.getElementById('linkCategory').value = link.category;
    } else {
        title.textContent = 'Adicionar Link';
        document.getElementById('linkForm').reset();
        document.getElementById('linkId').value = '';
    }
    
    linkModal.classList.add('active');
}

function editLink(name) {
    const link = appData.links.find(l => l.name === name);
    if (link) openLinkModal(link);
}

function deleteLink(name) {
    if (confirm(`Tem certeza que deseja excluir o link "${name}"?`)) {
        appData.links = appData.links.filter(l => l.name !== name);
        renderLinks();
    }
}

async function saveToGitHub() {
    if (!REPO_OWNER || !REPO_NAME) {
        alert('Configuração do repositório ausente no script.js. Por favor, configure REPO_OWNER e REPO_NAME.');
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';

    try {
        const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        
        // 1. Obter o SHA do arquivo atual
        const getRes = await fetch(apiUrl, {
            headers: { 'Authorization': `token ${githubToken}` }
        });
        
        let sha = '';
        if (getRes.ok) {
            const fileData = await getRes.json();
            sha = fileData.sha;
        }

        // 2. Atualizar o arquivo
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(appData, null, 2))));
        const putRes = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update links by ${currentUserEmail}`,
                content: content,
                sha: sha
            })
        });

        if (putRes.ok) {
            alert('Alterações salvas com sucesso no GitHub!');
            toggleEditMode(false);
        } else {
            const err = await putRes.json();
            throw new Error(err.message || 'Erro ao salvar');
        }
    } catch (error) {
        console.error('Erro ao salvar:', error);
        alert('Erro ao salvar no GitHub: ' + error.message);
        if (error.message.includes('Bad credentials')) {
            localStorage.removeItem('github_pat');
            githubToken = '';
        }
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar Alterações';
    }
}
