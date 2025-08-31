// Estado global da aplicação
let currentPageId = 'main';
let pages = {
    'main': {
        id: 'main',
        title: 'Bem-vindo ao Editor',
        content: [],
        parentId: null,
        children: []
    }
};
let blockCounter = 0;
let selectedBlock = null;
let draggedBlock = null;

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', function() {
    initializeEditor();
    setupEventListeners();
    loadPages();
    
    // Inicializar marcadores de listas existentes
    setTimeout(() => {
        document.querySelectorAll('.list-block').forEach(listBlock => {
            updateListMarkers(listBlock);
        });
    }, 100);
});

// Inicializar editor
function initializeEditor() {
    const editorContent = document.getElementById('editor-content');
    
    // Configurar contenteditable
    setupContentEditable();
    
    // Configurar arrastar e soltar
    setupDragAndDrop();
    
    // Configurar atalhos de teclado
    setupKeyboardShortcuts();
}

// Configurar listeners de eventos
function setupEventListeners() {
    // Listener para mudanças no título da página
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
        pageTitle.addEventListener('input', function() {
            if (pages[currentPageId]) {
                pages[currentPageId].title = this.textContent;
                updatePagesList();
                updateAllIndexes();
                updateAllTocs();
            }
        });
    }

    // Listeners para inputs de arquivo
    document.getElementById('file-input').addEventListener('change', handleFileLoad);
    document.getElementById('image-input').addEventListener('change', handleImageUpload);
    document.getElementById('pdf-input').addEventListener('change', handlePdfUpload);
    
    // Listener para input de capa
    const coverInput = document.getElementById('cover-input');
    if (coverInput) {
        coverInput.addEventListener('change', handleCoverImageUpload);
    }
    
    // Fechar seletor de emoji ao clicar fora
    document.addEventListener('click', function(e) {
        const emojiSelector = document.getElementById('emoji-selector');
        const emojiContainer = e.target.closest('.emoji-container');
        
        if (emojiSelector && !emojiContainer) {
            emojiSelector.style.display = 'none';
        }
    });
}

// Configurar contenteditable
function setupContentEditable() {
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const activeElement = document.activeElement;
            if (activeElement && activeElement.classList.contains('block-content')) {
                e.preventDefault();
                createNewBlock(activeElement.closest('.block'));
            }
        }
        
        if (e.key === 'Backspace') {
            const activeElement = document.activeElement;
            if (activeElement && activeElement.classList.contains('block-content')) {
                if (activeElement.textContent.trim() === '') {
                    e.preventDefault();
                    deleteBlock(activeElement.closest('.block'));
                }
            }
        }
        
        if (e.key === '/') {
            const activeElement = document.activeElement;
            if (activeElement && activeElement.classList.contains('block-content') && activeElement.textContent === '') {
                e.preventDefault();
                showBlockMenu(activeElement.closest('.block'));
            }
        }
    });
}

// Configurar arrastar e soltar
function setupDragAndDrop() {
    document.addEventListener('dragstart', function(e) {
        if (e.target.closest('.block')) {
            draggedBlock = e.target.closest('.block');
            e.dataTransfer.effectAllowed = 'move';
        }
    });
    
    document.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });
    
    document.addEventListener('drop', function(e) {
        e.preventDefault();
        const targetBlock = e.target.closest('.block');
        if (targetBlock && draggedBlock && targetBlock !== draggedBlock) {
            const editorContent = document.getElementById('editor-content');
            const targetRect = targetBlock.getBoundingClientRect();
            const dropY = e.clientY;
            
            if (dropY < targetRect.top + targetRect.height / 2) {
                editorContent.insertBefore(draggedBlock, targetBlock);
            } else {
                editorContent.insertBefore(draggedBlock, targetBlock.nextSibling);
            }
        }
        draggedBlock = null;
    });
}

// Configurar atalhos de teclado
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl+S para salvar
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveCurrentPage();
        }
        
        // Ctrl+O para abrir
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            loadPage();
        }
        
        // Ctrl+N para nova página
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            createNewPage();
        }
        
        // Delete ou Backspace para excluir bloco selecionado
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlock) {
            // Verificar se não estamos dentro de um campo de texto
            const activeElement = document.activeElement;
            const isTextInput = activeElement && (
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.tagName === 'INPUT' ||
                activeElement.contentEditable === 'true'
            );
            
            // Se não estamos em um campo de texto, excluir o bloco
            if (!isTextInput) {
                e.preventDefault();
                confirmDeleteBlock(selectedBlock);
            }
        }
    });
}

// Adicionar novo bloco
function addBlock(type) {
    const editorContent = document.getElementById('editor-content');
    const block = createBlockElement(type);
    
    // Encontrar bloco de referência (bloco atual)
    let referenceBlock = getCurrentBlock();
    
    // Inserir o novo bloco após o bloco de referência
    if (referenceBlock && referenceBlock.parentNode === editorContent) {
        referenceBlock.parentNode.insertBefore(block, referenceBlock.nextSibling);
    } else {
        editorContent.appendChild(block);
    }
    
    block.classList.add('new-block');
    setTimeout(() => block.classList.remove('new-block'), 300);
    
    // Focar no novo bloco e marcá-lo como selecionado
    const blockContent = block.querySelector('.block-content');
    if (blockContent) {
        // Limpar seleção anterior
        selectedBlock = null;
        
        // Focar no novo bloco
        blockContent.focus();
        
        // Marcar como bloco selecionado após o foco
        setTimeout(() => {
            selectedBlock = block;
        }, 50);
    }
    
    // Atualizar índices se necessário
    if (type === 'index') {
        setTimeout(() => updateAllIndexes(), 100);
    }
    
    // Atualizar índices de tópicos se necessário
    if (type === 'toc' || type === 'h1' || type === 'h2' || type === 'h3') {
        setTimeout(() => updateAllTocs(), 100);
    }
    
    saveCurrentPageContent();
}

// Obter bloco atual baseado no foco ou seleção
function getCurrentBlock() {
    const editorContent = document.getElementById('editor-content');
    
    // 1. Verificar elemento com foco (prioridade mais alta)
    const focusedElement = document.activeElement;
    if (focusedElement) {
        const block = focusedElement.closest('.block');
        if (block && editorContent.contains(block)) {
            return block;
        }
    }
    
    // 2. Verificar posição do cursor na seleção
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
        const block = element.closest('.block');
        if (block && editorContent.contains(block)) {
            return block;
        }
    }
    
    // 3. Verificar se há um bloco selecionado globalmente
    if (selectedBlock && editorContent.contains(selectedBlock)) {
        return selectedBlock;
    }
    
    // 4. Usar último bloco visível no editor
    const allBlocks = editorContent.querySelectorAll('.block');
    if (allBlocks.length > 0) {
        // Encontrar o último bloco que está visível
        for (let i = allBlocks.length - 1; i >= 0; i--) {
            const block = allBlocks[i];
            const rect = block.getBoundingClientRect();
            if (rect.height > 0) {
                return block;
            }
        }
        return allBlocks[allBlocks.length - 1];
    }
    
    return null;
}

// Criar elemento de bloco
function createBlockElement(type, content = '') {
    blockCounter++;
    const block = document.createElement('div');
    block.className = 'block';
    block.setAttribute('data-block-type', type);
    block.setAttribute('data-block-id', `block-${blockCounter}`);
    block.draggable = true;
    
    let blockHTML = '';
    
    switch (type) {
        case 'h1':
        case 'h2':
        case 'h3':
            blockHTML = `<div class="block-content" contenteditable="true" placeholder="Título...">${content}</div>`;
            break;
        case 'p':
            blockHTML = `<div class="block-content" contenteditable="true" placeholder="Digite algo ou use '/' para comandos...">${content}</div>`;
            break;
        case 'ul':
            blockHTML = createListBlock('ul', content);
            break;
        case 'ol':
            blockHTML = createListBlock('ol', content);
            break;
        case 'toggle':
            blockHTML = createToggleBlock(content);
            break;
        case 'image':
            blockHTML = createImageBlock();
            break;
        case 'video':
            blockHTML = createVideoBlock();
            break;
        case 'link':
            blockHTML = createLinkBlock();
            break;
        case 'pdf':
            blockHTML = createPdfBlock();
            break;
        case 'index':
            blockHTML = createIndexBlock();
            break;
        case 'toc':
            blockHTML = createTocBlock();
            break;
        case 'code':
            blockHTML = createCodeBlock(content);
            break;
        case 'external':
            blockHTML = createExternalBlock(content);
            break;
        case 'live-code':
            blockHTML = createLiveCodeBlock(content);
            break;
        default:
            blockHTML = `<div class="block-content" contenteditable="true" placeholder="Digite algo...">${content}</div>`;
    }
    
    block.innerHTML = blockHTML;
    
    // Adicionar event listeners
    setupBlockEventListeners(block);
    
    return block;
}

// Criar elemento de bloco com dados completos (para importação)
function createBlockElementWithData(blockData) {
    const type = blockData.type;
    const content = blockData.content;
    const extraData = blockData.extraData || {};
    
    
    blockCounter++;
    const block = document.createElement('div');
    block.className = 'block';
    block.setAttribute('data-block-type', type);
    block.setAttribute('data-block-id', `block-${blockCounter}`);
    block.draggable = true;
    
    let blockHTML = '';
    
    switch (type) {
        case 'h1':
        case 'h2':
        case 'h3':
            blockHTML = `<div class="block-content" contenteditable="true" placeholder="Título...">${content}</div>`;
            break;
        case 'p':
            blockHTML = `<div class="block-content" contenteditable="true" placeholder="Digite algo ou use '/' para comandos...">${content}</div>`;
            break;
        case 'ul':
        case 'ol':
            if (extraData.listItems && extraData.listItems.length > 0) {
                const listId = `list-${blockCounter}`;
                blockHTML = `
                    <div class="list-block ${type}-list" id="${listId}" data-list-type="${type}">
                        <div class="list-content">
                        </div>
                    </div>
                `;
                
                // Criar o bloco primeiro, depois adicionar os itens
                block.innerHTML = blockHTML;
                
                // Adicionar itens da lista
                const listContent = block.querySelector('.list-content');
                extraData.listItems.forEach((item, index) => {
                    const listItem = document.createElement('div');
                    listItem.className = 'list-item';
                    listItem.setAttribute('data-level', item.level || '0');
                    
                    listItem.innerHTML = `
                        <div class="list-marker ${type}-marker" data-index="${index + 1}"></div>
                        <div class="list-item-content" contenteditable="true" placeholder="Digite o item da lista...">${item.content || ''}</div>
                        <div class="list-controls">
                            <button class="list-control-btn" onclick="addListItem('${listId}')" title="Adicionar item">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="list-control-btn" onclick="indentListItem(this)" title="Aumentar recuo">
                                <i class="fas fa-indent"></i>
                            </button>
                            <button class="list-control-btn" onclick="outdentListItem(this)" title="Diminuir recuo">
                                <i class="fas fa-outdent"></i>
                            </button>
                        </div>
                    `;
                    
                    listContent.appendChild(listItem);
                });
                
                
                // Atualizar marcadores das listas
                setTimeout(() => {
                    const listBlock = block.querySelector('.list-block');
                    if (listBlock) {
                        updateListMarkers(listBlock);
                    }
                }, 0);
                
                return block;
            } else {
                blockHTML = createListBlock(type, content);
            }
            break;
        case 'toggle':
            if (extraData.content !== undefined) {
                blockHTML = `
                    <div class="toggle-header" onclick="toggleExpand(this)">
                        <i class="fas fa-chevron-right toggle-icon ${extraData.isOpen ? 'expanded' : ''}"></i>
                        <div class="block-content" contenteditable="true" placeholder="Toggle title...">${content}</div>
                    </div>
                    <div class="toggle-content" style="display: ${extraData.isOpen ? 'block' : 'none'};">
                        <div class="toggle-inner-content">
                            <div class="block-content" contenteditable="true" placeholder="Conteúdo do toggle...">${extraData.content}</div>
                        </div>
                    </div>
                `;
            } else {
                blockHTML = createToggleBlock(content);
            }
            break;
        case 'code':
            if (extraData.language) {
                blockHTML = createCodeBlock(content);
                block.innerHTML = blockHTML;
                
                // Definir linguagem após criar o bloco
                setTimeout(() => {
                    const codeBlock = block.querySelector('.code-block');
                    if (codeBlock) {
                        codeBlock.setAttribute('data-language', extraData.language);
                        const select = codeBlock.querySelector('.code-language-select');
                        if (select) {
                            select.value = extraData.language;
                        }
                        updateCodePreview(codeBlock.id);
                    }
                }, 0);
                
                return block;
            } else {
                blockHTML = createCodeBlock(content);
            }
            break;
        case 'live-code':
            if (extraData.htmlCode !== undefined || extraData.cssCode !== undefined || extraData.jsCode !== undefined) {
                blockHTML = createLiveCodeBlock('');
                block.innerHTML = blockHTML;
                
                // Aplicar código após criar o bloco
                setTimeout(() => {
                    const liveCodeBlock = block.querySelector('.live-code-block');
                    if (liveCodeBlock) {
                        const htmlEditor = liveCodeBlock.querySelector('.code-editor[data-lang="html"]');
                        const cssEditor = liveCodeBlock.querySelector('.code-editor[data-lang="css"]');
                        const jsEditor = liveCodeBlock.querySelector('.code-editor[data-lang="js"]');
                        
                        if (htmlEditor && extraData.htmlCode) htmlEditor.value = extraData.htmlCode;
                        if (cssEditor && extraData.cssCode) cssEditor.value = extraData.cssCode;
                        if (jsEditor && extraData.jsCode) jsEditor.value = extraData.jsCode;
                        
                        updateLiveCodePreview(liveCodeBlock.id);
                    }
                }, 0);
                
                return block;
            } else {
                blockHTML = createLiveCodeBlock(content);
            }
            break;
        case 'image':
            if (extraData.mediaType === 'image' && content) {
                blockHTML = `
                    <div class="media-block">
                        <div class="media-content">
                            <img src="${content}" alt="${extraData.alt || ''}" style="max-width: 100%; height: auto;">
                        </div>
                    </div>
                `;
            } else {
                blockHTML = createImageBlock();
            }
            break;
        case 'video':
            if (extraData.mediaType === 'video' && content) {
                blockHTML = `
                    <div class="media-block">
                        <div class="media-content">
                            <video controls style="width: 100%; max-width: 100%;">
                                <source src="${content}" type="video/mp4">
                                Seu navegador não suporta vídeos.
                            </video>
                        </div>
                    </div>
                `;
            } else {
                blockHTML = createVideoBlock();
            }
            break;
        case 'link':
            if (extraData.url && extraData.title) {
                blockHTML = `
                    <a href="${extraData.url}" target="_blank" class="link-block">
                        <i class="fas fa-external-link-alt link-icon"></i>
                        <div class="link-content">
                            <div class="link-title">${extraData.title}</div>
                            <div class="link-url">${extraData.url}</div>
                        </div>
                    </a>
                `;
            } else {
                blockHTML = createLinkBlock();
            }
            break;
        case 'pdf':
            if (extraData.mediaType === 'pdf' && content) {
                blockHTML = `
                    <div class="media-block">
                        <div class="media-content">
                            <iframe src="${content}" type="application/pdf" style="width: 100%; height: 400px;"></iframe>
                        </div>
                    </div>
                `;
            } else {
                blockHTML = createPdfBlock();
            }
            break;
        case 'external':
            if (extraData.mediaType === 'external' && content) {
                blockHTML = createExternalBlock(content);
                
                // Aplicar dimensões se especificadas
                block.innerHTML = blockHTML;
                if (extraData.width || extraData.height) {
                    setTimeout(() => {
                        const externalBlock = block.querySelector('.external-block');
                        if (externalBlock) {
                            if (extraData.width) externalBlock.style.width = extraData.width;
                            if (extraData.height) externalBlock.style.height = extraData.height;
                        }
                    }, 0);
                }
                
                return block;
            } else {
                blockHTML = createExternalBlock(content);
            }
            break;
        case 'index':
            blockHTML = createIndexBlock();
            break;
        case 'toc':
            blockHTML = createTocBlock();
            break;
        default:
            blockHTML = `<div class="block-content" contenteditable="true" placeholder="Digite algo...">${content}</div>`;
    }
    
    block.innerHTML = blockHTML;
    
    // Aplicar dados extras como atributos
    if (extraData) {
        Object.keys(extraData).forEach(key => {
            if (key !== 'listItems' && key !== 'content' && key !== 'isOpen' && 
                key !== 'htmlCode' && key !== 'cssCode' && key !== 'jsCode' &&
                key !== 'mediaType' && key !== 'alt' && key !== 'url' && key !== 'title' &&
                key !== 'width' && key !== 'height' && key !== 'language') {
                block.dataset[key] = extraData[key];
            }
        });
    }
    
    return block;
}

// Criar bloco toggle
function createToggleBlock(content = '') {
    return `
        <div class="toggle-header" onclick="toggleExpand(this)">
            <i class="fas fa-chevron-right toggle-icon"></i>
            <div class="block-content" contenteditable="true" placeholder="Toggle title...">${content}</div>
        </div>
        <div class="toggle-content">
            <div class="toggle-inner-content">
                <div class="block-content" contenteditable="true" placeholder="Conteúdo do toggle..."></div>
                <div class="toggle-actions">
                    <div class="toggle-actions-row">
                        <button class="add-toggle-block-btn" onclick="addBlockToToggle(this, 'p')" title="Adicionar parágrafo">
                            <i class="fas fa-paragraph"></i> Texto
                        </button>
                        <button class="add-toggle-block-btn" onclick="addBlockToToggle(this, 'h1')" title="Adicionar título 1">
                            <i class="fas fa-heading"></i> H1
                        </button>
                        <button class="add-toggle-block-btn" onclick="addBlockToToggle(this, 'h2')" title="Adicionar título 2">
                            <i class="fas fa-heading"></i> H2
                        </button>
                        <button class="add-toggle-block-btn" onclick="addBlockToToggle(this, 'h3')" title="Adicionar título 3">
                            <i class="fas fa-heading"></i> H3
                        </button>
                    </div>
                    <div class="toggle-actions-row">
                        <button class="add-toggle-block-btn" onclick="addBlockToToggle(this, 'ul')" title="Adicionar lista">
                            <i class="fas fa-list-ul"></i> Lista
                        </button>
                        <button class="add-toggle-block-btn" onclick="addBlockToToggle(this, 'ol')" title="Adicionar lista numerada">
                            <i class="fas fa-list-ol"></i> Numerada
                        </button>
                        <button class="add-toggle-block-btn" onclick="addBlockToToggle(this, 'code')" title="Adicionar código">
                            <i class="fas fa-code"></i> Código
                        </button>
                        <button class="add-toggle-block-btn" onclick="addBlockToToggle(this, 'toggle')" title="Adicionar toggle aninhado">
                            <i class="fas fa-chevron-right"></i> Toggle
                        </button>
                    </div>
                    <div class="toggle-actions-row">
                        <button class="add-toggle-block-btn" onclick="addBlockToToggle(this, 'image')" title="Adicionar imagem">
                            <i class="fas fa-image"></i> Imagem
                        </button>
                        <button class="add-toggle-block-btn" onclick="addBlockToToggle(this, 'video')" title="Adicionar vídeo">
                            <i class="fas fa-video"></i> Vídeo
                        </button>
                        <button class="add-toggle-block-btn" onclick="addBlockToToggle(this, 'link')" title="Adicionar link">
                            <i class="fas fa-link"></i> Link
                        </button>
                        <button class="add-toggle-block-btn" onclick="addBlockToToggle(this, 'pdf')" title="Adicionar PDF">
                            <i class="fas fa-file-pdf"></i> PDF
                        </button>
                    </div>
                    <div class="toggle-actions-row">
                        <button class="add-toggle-block-btn" onclick="addBlockToToggle(this, 'index')" title="Adicionar índice">
                            <i class="fas fa-list"></i> Índice
                        </button>
                        <button class="add-toggle-block-btn" onclick="addBlockToToggle(this, 'toc')" title="Adicionar índice de tópicos">
                            <i class="fas fa-list-alt"></i> Tópicos
                        </button>
                        <button class="add-toggle-block-btn" onclick="addBlockToToggle(this, 'external')" title="Adicionar página externa">
                            <i class="fas fa-external-link-alt"></i> Externa
                        </button>
                        <button class="add-toggle-block-btn" onclick="addBlockToToggle(this, 'live-code')" title="Adicionar código interpretável">
                            <i class="fas fa-play-circle"></i> Executar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Criar bloco de lista (ul ou ol) com suporte a hierarquia
function createListBlock(listType, content = '') {
    const listId = `list-${blockCounter}`;
    return `
        <div class="list-block ${listType}-list" id="${listId}" data-list-type="${listType}">
            <div class="list-content">
                <div class="list-item" data-level="0">
                    <div class="list-marker ${listType}-marker" data-index="1"></div>
                    <div class="list-item-content" contenteditable="true" placeholder="Digite o item da lista...">${content}</div>
                    <div class="list-controls">
                        <button class="list-control-btn" onclick="addListItem('${listId}')" title="Adicionar item">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="list-control-btn" onclick="indentListItem(this)" title="Aumentar recuo">
                            <i class="fas fa-indent"></i>
                        </button>
                        <button class="list-control-btn" onclick="outdentListItem(this)" title="Diminuir recuo">
                            <i class="fas fa-outdent"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Criar bloco de imagem
function createImageBlock() {
    return `
        <div class="media-block">
            <div class="media-placeholder" onclick="selectImage(this)">
                <i class="fas fa-image" style="font-size: 24px; margin-bottom: 8px;"></i>
                <div>Clique para adicionar uma imagem</div>
            </div>
        </div>
    `;
}

// Criar bloco de vídeo
function createVideoBlock() {
    return `
        <div class="media-block">
            <div class="media-placeholder" onclick="addVideoUrl(this)">
                <i class="fas fa-video" style="font-size: 24px; margin-bottom: 8px;"></i>
                <div>Clique para adicionar URL do vídeo</div>
            </div>
        </div>
    `;
}

// Criar bloco de link
function createLinkBlock() {
    return `
        <div class="media-placeholder" onclick="addLinkUrl(this)" style="cursor: pointer;">
            <i class="fas fa-link" style="font-size: 24px; margin-bottom: 8px;"></i>
            <div>Clique para adicionar um link</div>
        </div>
    `;
}

// Criar bloco de PDF
function createPdfBlock() {
    return `
        <div class="media-block">
            <div class="media-placeholder" onclick="selectPdf(this)">
                <i class="fas fa-file-pdf" style="font-size: 24px; margin-bottom: 8px;"></i>
                <div>Clique para adicionar um PDF</div>
            </div>
        </div>
    `;
}

// Criar bloco de índice
function createIndexBlock() {
    const indexContent = generateIndexContent();
    return `
        <div class="index-block">
            <div class="index-header">
                <i class="fas fa-list"></i>
                Índice de Páginas
            </div>
            <div class="index-content" id="index-content-${blockCounter}">
                ${indexContent}
            </div>
        </div>
    `;
}

// Criar bloco de índice de tópicos (TOC)
function createTocBlock() {
    const tocContent = generateTocContent();
    return `
        <div class="toc-block">
            <div class="toc-header">
                <i class="fas fa-list-alt"></i>
                Índice de Tópicos
            </div>
            <div class="toc-content" id="toc-content-${blockCounter}">
                ${tocContent}
            </div>
        </div>
    `;
}

// Configurar listeners para blocos
function setupBlockEventListeners(block) {
    block.addEventListener('click', function() {
        selectedBlock = block;
        // Remover seleção anterior
        document.querySelectorAll('.block.selected').forEach(b => b.classList.remove('selected'));
        block.classList.add('selected');
    });
    
    const blockContent = block.querySelector('.block-content');
    if (blockContent) {
        blockContent.addEventListener('input', function() {
            saveCurrentPageContent();
        });
    }
    
    // Configurar listeners específicos para blocos de código
    if (block.classList.contains('code-block') || block.querySelector('.code-block')) {
        setupCodeBlockListeners(block.querySelector('.code-block') || block);
    }
    
    // Adicionar botão de exclusão
    addDeleteButtonToBlock(block);
}

// Adicionar botão de exclusão ao bloco
function addDeleteButtonToBlock(block) {
    // Verificar se já tem botão de exclusão
    if (block.querySelector('.delete-block-btn')) return;
    
    // Criar botão de exclusão
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-block-btn';
    deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
    deleteBtn.title = 'Excluir bloco';
    deleteBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        confirmDeleteBlock(block);
    };
    
    // Adicionar efeito de hover para destacar o bloco
    deleteBtn.onmouseenter = function() {
        block.classList.add('delete-highlight');
    };
    
    deleteBtn.onmouseleave = function() {
        block.classList.remove('delete-highlight');
    };
    
    // Adicionar botão ao bloco
    block.style.position = 'relative';
    block.appendChild(deleteBtn);
}

// Confirmar exclusão do bloco
function confirmDeleteBlock(block) {
    const blockType = block.getAttribute('data-block-type');
    const isToggleWithContent = blockType === 'toggle' && block.querySelectorAll('.toggle-nested-block').length > 0;
    const isCodeBlock = blockType === 'code';
    
    let message = 'Tem certeza que deseja excluir este bloco?';
    
    if (isToggleWithContent) {
        const nestedCount = block.querySelectorAll('.toggle-nested-block').length;
        message = `Este toggle contém ${nestedCount} bloco(s) aninhado(s). Tem certeza que deseja excluí-lo?`;
    } else if (isCodeBlock) {
        message = 'Tem certeza que deseja excluir este bloco de código?';
    }
    
    if (confirm(message)) {
        deleteBlockSafely(block);
    }
}

// Função melhorada para deletar bloco com segurança
function deleteBlockSafely(block) {
    const editorContent = document.getElementById('editor-content');
    const blocks = editorContent.querySelectorAll('.block');
    
    // Verificar se não é o último bloco
    if (blocks.length <= 1) {
        alert('Não é possível excluir o último bloco da página.');
        return;
    }
    
    // Encontrar bloco anterior ou próximo para focar
    const prevBlock = block.previousElementSibling;
    const nextBlock = block.nextElementSibling;
    
    // Remover bloco
    block.remove();
    
    // Focar no bloco anterior ou próximo
    const targetBlock = prevBlock || nextBlock;
    if (targetBlock && targetBlock.classList.contains('block')) {
        const blockContent = targetBlock.querySelector('.block-content, .code-editor');
        if (blockContent) {
            blockContent.focus();
            selectedBlock = targetBlock;
            
            // Remover seleção anterior e selecionar novo bloco
            document.querySelectorAll('.block.selected').forEach(b => b.classList.remove('selected'));
            targetBlock.classList.add('selected');
        }
    }
    
    saveCurrentPageContent();
    updateAllIndexes();
    updateAllTocs();
}

// Criar novo bloco após o atual
function createNewBlock(currentBlock) {
    const newBlock = createBlockElement('p');
    currentBlock.parentNode.insertBefore(newBlock, currentBlock.nextSibling);
    const blockContent = newBlock.querySelector('.block-content');
    if (blockContent) {
        blockContent.focus();
    }
    saveCurrentPageContent();
}

// Deletar bloco (função original para backspace em conteúdo vazio)
function deleteBlock(block) {
    const editorContent = document.getElementById('editor-content');
    const blocks = editorContent.querySelectorAll('.block');
    
    if (blocks.length > 1) {
        const prevBlock = block.previousElementSibling;
        block.remove();
        
        if (prevBlock) {
            const blockContent = prevBlock.querySelector('.block-content');
            if (blockContent) {
                blockContent.focus();
                // Posicionar cursor no final
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(blockContent);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }
    saveCurrentPageContent();
}

// Expandir/recolher toggle
function toggleExpand(toggleHeader) {
    const toggleContent = toggleHeader.nextElementSibling;
    const toggleIcon = toggleHeader.querySelector('.toggle-icon');
    
    if (toggleContent.classList.contains('visible')) {
        toggleContent.classList.remove('visible');
        toggleIcon.classList.remove('expanded');
    } else {
        toggleContent.classList.add('visible');
        toggleIcon.classList.add('expanded');
    }
}

// Adicionar bloco dentro de toggle
function addBlockToToggle(button, blockType) {
    const toggleContent = button.closest('.toggle-content');
    const toggleInnerContent = toggleContent.querySelector('.toggle-inner-content');
    const toggleActions = toggleContent.querySelector('.toggle-actions');
    
    // Criar novo bloco
    const newBlock = createBlockElement(blockType);
    newBlock.classList.add('toggle-nested-block');
    
    // Inserir antes dos botões de ação
    toggleInnerContent.insertBefore(newBlock, toggleActions);
    
    // Adicionar botão de exclusão específico para blocos aninhados
    addDeleteButtonToNestedBlock(newBlock);
    
    // Focar no novo bloco
    const blockContent = newBlock.querySelector('.block-content, .code-editor');
    if (blockContent) {
        blockContent.focus();
    }
    
    saveCurrentPageContent();
}

// Adicionar botão de exclusão para blocos aninhados
function addDeleteButtonToNestedBlock(block) {
    // Verificar se já tem botão de exclusão
    if (block.querySelector('.delete-nested-btn')) return;
    
    // Criar botão de exclusão
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-nested-btn';
    deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
    deleteBtn.title = 'Remover do toggle';
    deleteBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        confirmDeleteNestedBlock(block);
    };
    
    // Adicionar efeito de hover para destacar o bloco
    deleteBtn.onmouseenter = function() {
        block.classList.add('delete-highlight');
    };
    
    deleteBtn.onmouseleave = function() {
        block.classList.remove('delete-highlight');
    };
    
    // Adicionar botão ao bloco
    block.style.position = 'relative';
    block.appendChild(deleteBtn);
}

// Confirmar exclusão do bloco aninhado
function confirmDeleteNestedBlock(block) {
    const blockType = block.getAttribute('data-block-type');
    let message = 'Remover este bloco do toggle?';
    
    if (blockType === 'code') {
        message = 'Remover este código do toggle?';
    }
    
    if (confirm(message)) {
        deleteNestedBlockSafely(block);
    }
}

// Deletar bloco aninhado com segurança
function deleteNestedBlockSafely(block) {
    const toggleContent = block.closest('.toggle-content');
    const toggleInnerContent = toggleContent.querySelector('.toggle-inner-content');
    const nestedBlocks = toggleInnerContent.querySelectorAll('.toggle-nested-block');
    
    // Verificar se não é o último bloco aninhado
    if (nestedBlocks.length <= 1) {
        // Se só tem um bloco, remover e manter o conteúdo original do toggle
        block.remove();
    } else {
        // Encontrar bloco anterior ou próximo para focar
        const prevBlock = block.previousElementSibling;
        const nextBlock = block.nextElementSibling;
        
        // Remover bloco
        block.remove();
        
        // Focar no bloco anterior ou próximo
        const targetBlock = prevBlock && prevBlock.classList.contains('toggle-nested-block') ? 
                           prevBlock : 
                           nextBlock && nextBlock.classList.contains('toggle-nested-block') ? 
                           nextBlock : null;
        
        if (targetBlock) {
            const blockContent = targetBlock.querySelector('.block-content, .code-editor');
            if (blockContent) {
                blockContent.focus();
            }
        }
    }
    
    saveCurrentPageContent();
}

// Mudar alinhamento
function changeAlignment(alignment) {
    if (selectedBlock) {
        const blockContent = selectedBlock.querySelector('.block-content');
        if (blockContent) {
            // Remover classes de alinhamento anteriores
            blockContent.classList.remove('align-left', 'align-center', 'align-right', 'align-justify');
            // Adicionar nova classe
            blockContent.classList.add(`align-${alignment}`);
            saveCurrentPageContent();
        }
    }
}

// Selecionar imagem
function selectImage(placeholder) {
    selectedBlock = placeholder.closest('.block');
    document.getElementById('image-input').click();
}

// Manipular upload de imagem
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file && selectedBlock) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const mediaBlock = selectedBlock.querySelector('.media-block');
            mediaBlock.innerHTML = `
                <div class="media-content">
                    <img src="${e.target.result}" alt="Uploaded image">
                </div>
            `;
            saveCurrentPageContent();
        };
        reader.readAsDataURL(file);
    }
}

// Adicionar URL de vídeo
function addVideoUrl(placeholder) {
    const url = prompt('Digite a URL do vídeo (YouTube, Vimeo, etc.):');
    if (url) {
        const block = placeholder.closest('.block');
        const mediaBlock = block.querySelector('.media-block');
        
        let embedUrl = url;
        
        // Converter URLs do YouTube para embed
        if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
            const videoId = url.includes('youtu.be/') ? 
                url.split('youtu.be/')[1].split('?')[0] : 
                url.split('v=')[1].split('&')[0];
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
        
        // Converter URLs do Vimeo para embed
        if (url.includes('vimeo.com/')) {
            const videoId = url.split('vimeo.com/')[1];
            embedUrl = `https://player.vimeo.com/video/${videoId}`;
        }
        
        mediaBlock.innerHTML = `
            <div class="media-content">
                <iframe src="${embedUrl}" allowfullscreen></iframe>
            </div>
        `;
        saveCurrentPageContent();
    }
}

// Adicionar URL de link
function addLinkUrl(placeholder) {
    const url = prompt('Digite a URL do link:');
    const title = prompt('Digite o título do link (opcional):') || url;
    
    if (url) {
        const block = placeholder.closest('.block');
        block.innerHTML = `
            <a href="${url}" target="_blank" class="link-block">
                <i class="fas fa-external-link-alt link-icon"></i>
                <div class="link-content">
                    <div class="link-title">${title}</div>
                    <div class="link-url">${url}</div>
                </div>
            </a>
        `;
        saveCurrentPageContent();
    }
}

// Selecionar PDF
function selectPdf(placeholder) {
    selectedBlock = placeholder.closest('.block');
    document.getElementById('pdf-input').click();
}

// Manipular upload de PDF
function handlePdfUpload(event) {
    const file = event.target.files[0];
    if (file && selectedBlock) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const mediaBlock = selectedBlock.querySelector('.media-block');
            mediaBlock.innerHTML = `
                <div class="media-content">
                    <iframe src="${e.target.result}" type="application/pdf"></iframe>
                </div>
            `;
            saveCurrentPageContent();
        };
        reader.readAsDataURL(file);
    }
}

// Processar upload da imagem de capa
function handleCoverImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const coverArea = document.getElementById('cover-area');
        const placeholder = document.getElementById('cover-placeholder');
        
        if (!coverArea) return;
        
        // Remover placeholder
        if (placeholder) {
            placeholder.remove();
        }
        
        // Adicionar imagem
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'cover-image';
        img.alt = 'Capa da página';
        coverArea.appendChild(img);
        
        // Salvar na página atual
        if (pages[currentPageId]) {
            pages[currentPageId].coverImage = e.target.result;
            saveCurrentPageContent();
        }
    };
    reader.readAsDataURL(file);
}

// Lista completa de emojis Unicode coloridos organizados por categoria (300+ emojis!)
const emojiCategories = {
    'Rostos & Pessoas': [
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'
    ],
    'Animais & Natureza': [
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🐘', '🦏', '🐪', '🐫', '🦒', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🦌', '🐕', '🐩', '🐈', '🐓', '🦃', '🕊️', '🐇', '🐁', '🐀', '🐿️', '🦔', '🐾', '🐉', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🎋', '🎍', '🌾', '🌵', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌸', '💐', '🍄', '🌰', '🎃', '🌙', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌝', '🌞', '⭐', '🌟', '💫', '✨', '☄️', '🌍', '🌎', '🌏', '🔥', '💥', '❄️', '🌨️', '☁️', '⛅', '⛈️', '🌤️', '🌦️', '🌧️', '🌩️', '🌪️', '🌈', '☀️', '⚡'
    ],
    'Comida & Bebida': [
        '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🥔', '🍠', '🥐', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍘', '🍥', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🎂', '🍰', '🧁', '🍮', '🍭', '🍬', '🍫', '🍿', '🧂', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🍵', '🧃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🍾', '🧊'
    ],
    'Atividades & Esportes': [
        '⚽', '🏀', '🏈', '⚾', '🥎', '🏐', '🏉', '🎾', '🥏', '🏓', '🏸', '🥍', '🏑', '🏒', '🥌', '🛷', '⛳', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '⛸️', '🥌', '🛷', '🎿', '⛷️', '🏂', '🏋️‍♀️', '🏋️‍♂️', '🤼‍♀️', '🤼‍♂️', '🤸‍♀️', '🤸‍♂️', '⛹️‍♀️', '⛹️‍♂️', '🤾‍♀️', '🤾‍♂️', '🏌️‍♀️', '🏌️‍♂️', '🏇', '🧘‍♀️', '🧘‍♂️', '🏄‍♀️', '🏄‍♂️', '🏊‍♀️', '🏊‍♂️', '🤽‍♀️', '🤽‍♂️', '🚣‍♀️', '🚣‍♂️', '🧗‍♀️', '🧗‍♂️', '🚵‍♀️', '🚵‍♂️', '🚴‍♀️', '🚴‍♂️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🥇', '🎯', '🎳', '🎮', '🎰', '🧩'
    ],
    'Viagem & Lugares': [
        '🚗', '🚙', '🚐', '🚛', '🚜', '🏎️', '🏍️', '🛴', '🚲', '🛵', '🚁', '🛸', '✈️', '🛩️', '🚤', '🛥️', '🚢', '⛵', '🚂', '🚆', '🚄', '🚅', '🚈', '🚝', '🚞', '🚋', '🚃', '🚎', '🚌', '🚐', '🚑', '🚒', '🚓', '🚔', '🚕', '🚖', '🚘', '🚙', '🚚', '🚛', '🚜', '🏁', '🚩', '🏴', '🏳️', '🏳️‍🌈', '🏴‍☠️', '🇦🇫', '🇦🇽', '🇦🇱', '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲', '🇦🇼', '🇦🇺', '🇦🇹', '🇦🇿', '🇧🇸', '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪', '🇧🇿', '🇧🇯', '🇧🇲', '🇧🇹', '🇧🇴', '🇧🇦', '🇧🇼', '🇧🇷', '🇧🇳', '🇧🇬', '🇧🇫', '🇧🇮', '🇰🇭', '🇨🇲', '🇨🇦', '🇮🇨', '🇨🇻', '🇧🇶', '🇰🇾', '🇨🇫', '🇹🇩', '🇨🇱', '🇨🇳', '🇨🇽', '🇨🇨', '🇨🇴', '🇰🇲', '🇨🇬', '🇨🇩', '🇨🇰', '🇨🇷', '🇨🇮', '🇭🇷', '🇨🇺', '🇨🇼', '🇨🇾', '🇨🇿', '🇩🇰', '🇩🇯', '🇩🇲', '🇩🇴', '🇪🇨', '🇪🇬', '🇸🇻', '🇬🇶', '🇪🇷', '🇪🇪', '🇪🇹', '🇪🇺', '🇫🇰', '🇫🇴', '🇫🇯', '🇫🇮', '🇫🇷', '🇬🇫', '🇵🇫', '🇹🇫', '🇬🇦', '🇬🇲', '🇬🇪', '🇩🇪', '🇬🇭', '🇬🇮', '🇬🇷', '🇬🇱', '🇬🇩', '🇬🇵', '🇬🇺', '🇬🇹', '🇬🇬', '🇬🇳', '🇬🇼', '🇬🇾', '🇭🇹', '🇭🇳', '🇭🇰', '🇭🇺', '🇮🇸', '🇮🇳', '🇮🇩', '🇮🇷', '🇮🇶', '🇮🇪', '🇮🇲', '🇮🇱', '🇮🇹', '🇯🇲', '🇯🇵', '🎌', '🇯🇪', '🇯🇴', '🇰🇿', '🇰🇪', '🇰🇮', '🇰🇵', '🇰🇷', '🇰🇼', '🇰🇬', '🇱🇦', '🇱🇻', '🇱🇧', '🇱🇸', '🇱🇷', '🇱🇾', '🇱🇮', '🇱🇹', '🇱🇺', '🇲🇴', '🇲🇰', '🇲🇬', '🇲🇼', '🇲🇾', '🇲🇻', '🇲🇱', '🇲🇹', '🇲🇭', '🇲🇶', '🇲🇷', '🇲🇺', '🇾🇹', '🇲🇽', '🇫🇲', '🇲🇩', '🇲🇨', '🇲🇳', '🇲🇪', '🇲🇸', '🇲🇦', '🇲🇿', '🇲🇲', '🇳🇦', '🇳🇷', '🇳🇵', '🇳🇱', '🇳🇨', '🇳🇿', '🇳🇮', '🇳🇪', '🇳🇬', '🇳🇺', '🇳🇫', '🇰🇵', '🇲🇵', '🇳🇴', '🇴🇲', '🇵🇰', '🇵🇼', '🇵🇸', '🇵🇦', '🇵🇬', '🇵🇾', '🇵🇪', '🇵🇭', '🇵🇳', '🇵🇱', '🇵🇹', '🇵🇷', '🇶🇦', '🇷🇪', '🇷🇴', '🇷🇺', '🇷🇼', '🇧🇱', '🇸🇭', '🇰🇳', '🇱🇨', '🇵🇲', '🇻🇨', '🇼🇸', '🇸🇲', '🇸🇹', '🇸🇦', '🇸🇳', '🇷🇸', '🇸🇨', '🇸🇱', '🇸🇬', '🇸🇰', '🇸🇮', '🇬🇸', '🇸🇧', '🇸🇴', '🇿🇦', '🇰🇷', '🇸🇸', '🇪🇸', '🇱🇰', '🇸🇩', '🇸🇷', '🇸🇿', '🇸🇪', '🇨🇭', '🇸🇾', '🇹🇼', '🇹🇯', '🇹🇿', '🇹🇭', '🇹🇱', '🇹🇬', '🇹🇰', '🇹🇴', '🇹🇹', '🇹🇳', '🇹🇷', '🇹🇲', '🇹🇨', '🇹🇻', '🇻🇮', '🇺🇬', '🇺🇦', '🇦🇪', '🇬🇧', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', '🇺🇸', '🇺🇾', '🇺🇿', '🇻🇺', '🇻🇦', '🇻🇪', '🇻🇳', '🇼🇫', '🇪🇭', '🇾🇪', '🇿🇲', '🇿🇼'
    ],
    'Objetos & Símbolos': [
        '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '⏱️', '⏲️', '⏰', '🕰️', '⏳', '⌛', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🗑️', '🛢️', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '⛓️', '🔫', '💣', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '💈', '⚗️', '🔭', '🔬', '🕳️', '💊', '💉', '🌡️', '🚽', '🚰', '🚿', '🛁', '🛀', '🛎️', '🔑', '🗝️', '🚪', '🛋️', '🛏️', '🛌', '🖼️', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🎊', '🎉', '🎎', '🏮', '🎐', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '📇', '🗃️', '🗳️', '🗄️', '📋', '📌', '📍', '📎', '🖇️', '📏', '📐', '✂️', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🔗', '📎', '🖇️', '📐', '📏', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '👁️‍🗨️', '🔚', '🔙', '🔛', '🔝', '🔜', '〰️', '➰', '➿', '✔️', '☑️', '🔘', '⚪', '⚫', '🔴', '🔵', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '⬛', '⬜', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧'
    ]
};

// Aplicar dados do cabeçalho quando mudamos de página
function applyHeaderData(page) {
    // Aplicar emoji
    const emojiElement = document.getElementById('page-emoji');
    if (emojiElement) {
        if (page.emoji) {
            emojiElement.textContent = page.emoji;
        } else {
            // Emoji padrão
            emojiElement.textContent = '😊';
        }
    }
    
    // Aplicar imagem de capa
    const coverArea = document.getElementById('cover-area');
    if (!coverArea) return;
    
    // Limpar conteúdo atual
    coverArea.innerHTML = '';
    
    if (page.coverImage) {
        // Adicionar imagem
        const img = document.createElement('img');
        img.src = page.coverImage;
        img.className = 'cover-image';
        img.alt = 'Capa da página';
        coverArea.appendChild(img);
    } else {
        // Adicionar placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'cover-placeholder';
        placeholder.id = 'cover-placeholder';
        placeholder.innerHTML = '<span>📸 Adicionar capa</span>';
        coverArea.appendChild(placeholder);
    }
}

// Selecionar imagem de capa
function selectCoverImage() {
    const input = document.getElementById('cover-input');
    if (input) {
        input.click();
    }
}

// Mostrar/esconder seletor de emoji
function toggleEmojiSelector() {
    const selector = document.getElementById('emoji-selector');
    if (selector) {
        if (selector.style.display === 'none') {
            selector.style.display = 'block';
            populateEmojiCategories();
            // Limpar busca
            const searchInput = document.getElementById('emoji-search-input');
            if (searchInput) {
                searchInput.value = '';
            }
        } else {
            selector.style.display = 'none';
        }
    }
}

// Popular categorias com todos os emojis
function populateEmojiCategories() {
    const container = document.getElementById('emoji-categories');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.entries(emojiCategories).forEach(([categoryName, emojis]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'emoji-category';
        
        const header = document.createElement('div');
        header.className = 'emoji-category-header';
        header.textContent = categoryName;
        categoryDiv.appendChild(header);
        
        const grid = document.createElement('div');
        grid.className = 'emoji-grid';
        
        emojis.forEach(emoji => {
            const emojiSpan = document.createElement('span');
            emojiSpan.className = 'emoji-option';
            emojiSpan.textContent = emoji;
            emojiSpan.onclick = () => selectEmoji(emoji);
            emojiSpan.title = emoji;
            grid.appendChild(emojiSpan);
        });
        
        categoryDiv.appendChild(grid);
        container.appendChild(categoryDiv);
    });
}

// Filtrar emojis pela busca
function filterEmojis() {
    const searchInput = document.getElementById('emoji-search-input');
    const container = document.getElementById('emoji-categories');
    
    if (!searchInput || !container) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        populateEmojiCategories();
        return;
    }
    
    container.innerHTML = '';
    
    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'search-results';
    
    const header = document.createElement('div');
    header.className = 'emoji-category-header';
    header.textContent = 'Resultados da busca';
    resultsDiv.appendChild(header);
    
    const grid = document.createElement('div');
    grid.className = 'emoji-grid';
    
    let foundEmojis = [];
    Object.values(emojiCategories).forEach(emojis => {
        foundEmojis = foundEmojis.concat(emojis);
    });
    
    // Filtrar por termo de busca (pode ser melhorado com nomes dos emojis)
    const filteredEmojis = foundEmojis.filter(emoji => {
        return emoji.includes(searchTerm) || getEmojiName(emoji).toLowerCase().includes(searchTerm);
    });
    
    if (filteredEmojis.length === 0) {
        const noResults = document.createElement('div');
        noResults.textContent = 'Nenhum emoji encontrado';
        noResults.style.textAlign = 'center';
        noResults.style.color = '#9b9a97';
        resultsDiv.appendChild(noResults);
    } else {
        filteredEmojis.forEach(emoji => {
            const emojiSpan = document.createElement('span');
            emojiSpan.className = 'emoji-option';
            emojiSpan.textContent = emoji;
            emojiSpan.onclick = () => selectEmoji(emoji);
            emojiSpan.title = emoji;
            grid.appendChild(emojiSpan);
        });
        resultsDiv.appendChild(grid);
    }
    
    container.appendChild(resultsDiv);
}

// Obter nome básico do emoji (placeholder - pode ser melhorado)
function getEmojiName(emoji) {
    const emojiNames = {
        '😀': 'feliz', '😃': 'sorrindo', '😄': 'alegre', '😁': 'sorriso',
        '🐶': 'cachorro', '🐱': 'gato', '🐭': 'rato', '🐹': 'hamster',
        '🍎': 'maçã', '🍐': 'pera', '🍊': 'laranja', '🍋': 'limão',
        '⚽': 'futebol', '🏀': 'basquete', '🏈': 'futebol americano',
        '🚗': 'carro', '🚙': 'carro', '🚐': 'van', '🚛': 'caminhão',
        '💻': 'computador', '📱': 'celular', '⌚': 'relógio'
    };
    return emojiNames[emoji] || emoji;
}

// Selecionar emoji Unicode
function selectEmoji(emoji) {
    const emojiElement = document.getElementById('page-emoji');
    if (emojiElement) {
        emojiElement.textContent = emoji;
    }
    
    // Salvar na página atual
    if (pages[currentPageId]) {
        pages[currentPageId].emoji = emoji;
        saveCurrentPageContent();
        updatePagesList();
    }
    
    // Esconder seletor
    const selector = document.getElementById('emoji-selector');
    if (selector) {
        selector.style.display = 'none';
    }
}

// Gerar conteúdo do índice
function generateIndexContent() {
    const rootPages = Object.values(pages).filter(page => !page.parentId);
    
    if (rootPages.length === 0) {
        return '<div class="index-empty">Nenhuma página encontrada</div>';
    }
    
    let indexHTML = '';
    
    function renderPageTree(page, level = 0) {
        const isSubpage = level > 0;
        const className = isSubpage ? 'index-item subpage' : 'index-item';
        
        indexHTML += `
            <div class="${className}" onclick="navigateToPage('${page.id}')">
                <i class="fas fa-file-alt index-item-icon"></i>
                ${page.title}
            </div>
        `;
        
        // Renderizar subpáginas
        if (page.children && page.children.length > 0) {
            page.children.forEach(childId => {
                if (pages[childId]) {
                    renderPageTree(pages[childId], level + 1);
                }
            });
        }
    }
    
    rootPages.forEach(page => renderPageTree(page));
    
    return indexHTML;
}

// Criar bloco de página externa
function createExternalBlock(content = '') {
    const externalId = `external-${blockCounter}`;
    return `
        <div class="external-block resizable-external" id="${externalId}" style="width: 100%; height: 400px;">
            <div class="external-header">
                <div class="external-drag-handle">
                    <i class="fas fa-grip-horizontal"></i>
                </div>
                <div class="external-controls">
                    <input type="text" class="external-url-input" placeholder="Digite a URL (página web, Google Drive, etc.)" 
                           onchange="loadExternalContent('${externalId}', this.value)" value="${content}">
                    <button class="external-load-btn" onclick="loadExternalContent('${externalId}', document.querySelector('#${externalId} .external-url-input').value)" title="Carregar página">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button class="external-autofit-btn" onclick="autoFitExternalContent('${externalId}')" title="Ajustar automaticamente para eliminar scroll">
                        <i class="fas fa-expand-arrows-alt"></i>
                    </button>
                    <div class="external-type-selector">
                        <select onchange="changeExternalType('${externalId}', this.value)">
                            <option value="auto">🌐 Auto</option>
                            <option value="docs">📄 Google Docs</option>
                            <option value="sheets">📊 Google Sheets</option>
                            <option value="slides">📽️ Google Slides</option>
                            <option value="drive">📁 Google Drive</option>
                            <option value="webpage">🌐 Página Web</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="external-content">
                ${content ? 
                    `<iframe src="${convertToEmbedUrl(content)}" frameborder="0" allowfullscreen></iframe>` : 
                    `<div class="external-placeholder">
                        <i class="fas fa-external-link-alt" style="font-size: 48px; margin-bottom: 16px; color: #9b9a97;"></i>
                        <h3>Página Externa</h3>
                        <p>Digite uma URL acima para incorporar:</p>
                        <ul style="text-align: left; max-width: 300px;">
                            <li>Páginas web externas</li>
                            <li>Google Docs, Sheets, Slides</li>
                            <li>Arquivos do Google Drive</li>
                            <li>Qualquer conteúdo público</li>
                        </ul>
                    </div>`
                }
            </div>
            <!-- Handles de redimensionamento -->
            <div class="resize-handle resize-handle-right" onmousedown="startResize(event, '${externalId}', 'right')"></div>
            <div class="resize-handle resize-handle-bottom" onmousedown="startResize(event, '${externalId}', 'bottom')"></div>
            <div class="resize-handle resize-handle-corner" onmousedown="startResize(event, '${externalId}', 'both')"></div>
        </div>
    `;
}

// Criar bloco de código interpretável (HTML/CSS/JS)
function createLiveCodeBlock(content = '') {
    const liveCodeId = `live-code-${blockCounter}`;
    return `
        <div class="live-code-block resizable-code" id="${liveCodeId}" style="width: 100%; height: 400px;">
            <div class="live-code-header">
                <div class="live-code-drag-handle">
                    <i class="fas fa-grip-horizontal"></i>
                </div>
                <div class="live-code-controls">
                    <select class="live-code-type-selector" onchange="changeLiveCodeType('${liveCodeId}', this.value)">
                        <option value="html">🌐 HTML + CSS + JS</option>
                        <option value="html-only">📝 HTML</option>
                        <option value="css-only">🎨 CSS</option>
                        <option value="js-only">⚡ JavaScript</option>
                    </select>
                    <button class="live-code-run-btn" onclick="runLiveCode('${liveCodeId}')" title="Executar código">
                        <i class="fas fa-play"></i> Executar
                    </button>
                    <button class="live-code-auto-toggle" onclick="toggleAutoRun('${liveCodeId}')" title="Execução automática">
                        <i class="fas fa-magic"></i> Auto
                    </button>
                </div>
            </div>
            <div class="live-code-content">
                <div class="live-code-editor-container">
                    <div class="live-code-tabs">
                        <div class="live-code-tab active" data-tab="html" onclick="switchLiveCodeTab('${liveCodeId}', 'html')">
                            <i class="fab fa-html5"></i> HTML
                        </div>
                        <div class="live-code-tab" data-tab="css" onclick="switchLiveCodeTab('${liveCodeId}', 'css')">
                            <i class="fab fa-css3-alt"></i> CSS
                        </div>
                        <div class="live-code-tab" data-tab="js" onclick="switchLiveCodeTab('${liveCodeId}', 'js')">
                            <i class="fab fa-js-square"></i> JS
                        </div>
                    </div>
                    <div class="live-code-editor-panels">
                        <textarea class="live-code-editor active" data-lang="html" placeholder="<!-- Digite seu HTML aqui -->
<h1>Olá Mundo!</h1>
<p>Este conteúdo será renderizado na visualização.</p>"></textarea>
                        <textarea class="live-code-editor" data-lang="css" placeholder="/* Digite seu CSS aqui */
h1 {
    color: #2383e2;
    text-align: center;
}

p {
    font-size: 16px;
    color: #666;
}"></textarea>
                        <textarea class="live-code-editor" data-lang="js" placeholder="// Digite seu JavaScript aqui
console.log('Olá do código interpretável!');

// Exemplo de interatividade
document.addEventListener('DOMContentLoaded', function() {
    console.log('Página carregada!');
});"></textarea>
                    </div>
                </div>
                <div class="live-code-preview">
                    <div class="live-code-preview-header">
                        <i class="fas fa-eye"></i> Preview
                        <button class="live-code-preview-fullscreen" onclick="togglePreviewFullscreen('${liveCodeId}')" title="Tela cheia">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                    <div class="live-code-output">
                        <iframe class="live-code-frame" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" frameborder="0"></iframe>
                    </div>
                </div>
            </div>
            <!-- Handles de redimensionamento -->
            <div class="resize-handle resize-handle-right" onmousedown="startResize(event, '${liveCodeId}', 'right')"></div>
            <div class="resize-handle resize-handle-bottom" onmousedown="startResize(event, '${liveCodeId}', 'bottom')"></div>
            <div class="resize-handle resize-handle-corner" onmousedown="startResize(event, '${liveCodeId}', 'both')"></div>
        </div>
    `;
}

// Criar bloco de código
function createCodeBlock(content = '') {
    const codeId = `code-${blockCounter}`;
    return `
        <div class="code-block resizable-code" data-language="javascript" id="${codeId}" style="width: 100%; height: 200px;">
            <div class="code-header">
                <div class="code-drag-handle">
                    <i class="fas fa-grip-horizontal"></i>
                </div>
                <select class="code-language-selector" onchange="changeCodeLanguage('${codeId}', this.value)">
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="json">JSON</option>
                    <option value="sql">SQL</option>
                    <option value="php">PHP</option>
                    <option value="java">Java</option>
                    <option value="csharp">C#</option>
                    <option value="cpp">C++</option>
                    <option value="typescript">TypeScript</option>
                    <option value="bash">Bash</option>
                    <option value="markdown">Markdown</option>
                    <option value="xml">XML</option>
                    <option value="yaml">YAML</option>
                    <option value="plaintext">Texto</option>
                </select>
                <div class="code-actions">
                    <button class="code-copy-btn" onclick="copyCodeToClipboard('${codeId}')" title="Copiar código">
                        <i class="fas fa-copy"></i>
                        <span>Copiar</span>
                    </button>
                    <button class="code-copy-btn" onclick="toggleCodePreview('${codeId}')" title="Alternar preview">
                        <i class="fas fa-eye"></i>
                        <span>Preview</span>
                    </button>
                </div>
            </div>
            <div class="code-content">
                <textarea class="code-editor" placeholder="Digite seu código aqui..." oninput="updateCodePreview('${codeId}')">${content}</textarea>
                <div class="code-preview">
                    <pre><code class="language-javascript">${content}</code></pre>
                </div>
            </div>
            <!-- Handles de redimensionamento -->
            <div class="resize-handle resize-handle-right" onmousedown="startResize(event, '${codeId}', 'right')"></div>
            <div class="resize-handle resize-handle-bottom" onmousedown="startResize(event, '${codeId}', 'bottom')"></div>
            <div class="resize-handle resize-handle-corner" onmousedown="startResize(event, '${codeId}', 'both')"></div>
        </div>
    `;
}

// Navegar para página via índice
function navigateToPage(pageId) {
    if (pages[pageId]) {
        switchToPage(pageId);
    }
}

// Atualizar todos os índices na página atual
function updateAllIndexes() {
    const indexBlocks = document.querySelectorAll('.index-block .index-content');
    const newContent = generateIndexContent();
    
    indexBlocks.forEach(indexBlock => {
        indexBlock.innerHTML = newContent;
    });
}

// Gerar conteúdo do índice de tópicos
function generateTocContent() {
    const editorContent = document.getElementById('editor-content');
    if (!editorContent) return '<div class="toc-empty">Nenhum tópico encontrado</div>';
    
    const headings = editorContent.querySelectorAll('.block[data-block-type="h1"], .block[data-block-type="h2"], .block[data-block-type="h3"]');
    
    if (headings.length === 0) {
        return '<div class="toc-empty">Nenhum tópico encontrado</div>';
    }
    
    let tocHTML = '';
    
    headings.forEach((heading, index) => {
        const level = heading.getAttribute('data-block-type');
        const text = heading.querySelector('.block-content').textContent.trim();
        const headingId = `heading-${index}`;
        
        // Adicionar ID ao elemento heading para navegação
        heading.id = headingId;
        
        const className = `toc-item toc-${level}`;
        const indent = level === 'h1' ? '0px' : level === 'h2' ? '20px' : '40px';
        
        tocHTML += `
            <div class="${className}" onclick="scrollToHeading('${headingId}')" style="margin-left: ${indent};">
                <i class="fas fa-${level === 'h1' ? 'heading' : level === 'h2' ? 'chevron-right' : 'dot-circle'} toc-item-icon"></i>
                ${text}
            </div>
        `;
    });
    
    return tocHTML;
}

// Atualizar todos os índices de tópicos
function updateAllTocs() {
    const tocBlocks = document.querySelectorAll('.toc-block .toc-content');
    const newContent = generateTocContent();
    
    tocBlocks.forEach(tocBlock => {
        tocBlock.innerHTML = newContent;
    });
}

// Navegar para um tópico específico
function scrollToHeading(headingId) {
    const heading = document.getElementById(headingId);
    if (heading) {
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Destacar temporariamente o tópico
        heading.style.backgroundColor = '#fff3cd';
        setTimeout(() => {
            heading.style.backgroundColor = '';
        }, 2000);
    }
}

// Mostrar menu de blocos (comando /)
function showBlockMenu(block) {
    const menu = document.createElement('div');
    menu.className = 'block-menu';
    menu.style.cssText = `
        position: absolute;
        background: white;
        border: 1px solid #e9e9e7;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        max-height: 200px;
        overflow-y: auto;
        min-width: 200px;
    `;
    
    const commands = [
        { label: '📝 Parágrafo', type: 'p' },
        { label: '# Título 1', type: 'h1' },
        { label: '## Título 2', type: 'h2' },
        { label: '### Título 3', type: 'h3' },
        { label: '• Lista', type: 'ul' },
        { label: '1. Lista numerada', type: 'ol' },
        { label: '▶️ Toggle', type: 'toggle' },
        { label: '🖼️ Imagem', type: 'image' },
        { label: '🎥 Vídeo', type: 'video' },
        { label: '🔗 Link', type: 'link' },
        { label: '📄 PDF', type: 'pdf' },
        { label: '📋 Índice', type: 'index' },
        { label: '📑 Tópicos', type: 'toc' },
        { label: '💻 Código', type: 'code' },
        { label: '🌐 Página Externa', type: 'external' },
        { label: '▶️ Código Interpretável', type: 'live-code' }
    ];
    
    commands.forEach(cmd => {
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 8px 12px;
            cursor: pointer;
            font-size: 14px;
            border-bottom: 1px solid #f1f1ef;
        `;
        item.textContent = cmd.label;
        
        item.addEventListener('click', () => {
            changeBlockType(block, cmd.type);
            menu.remove();
        });
        
        item.addEventListener('mouseenter', () => {
            item.style.backgroundColor = '#f1f1ef';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.backgroundColor = 'transparent';
        });
        
        menu.appendChild(item);
    });
    
    // Posicionar menu
    const rect = block.getBoundingClientRect();
    menu.style.top = (rect.bottom + window.scrollY) + 'px';
    menu.style.left = rect.left + 'px';
    
    document.body.appendChild(menu);
    
    // Remover menu ao clicar fora
    setTimeout(() => {
        document.addEventListener('click', function removeMenu() {
            menu.remove();
            document.removeEventListener('click', removeMenu);
        });
    }, 0);
}

// Mudar tipo de bloco
function changeBlockType(block, newType) {
    const currentContent = block.querySelector('.block-content').textContent;
    const newBlock = createBlockElement(newType, currentContent);
    
    block.parentNode.insertBefore(newBlock, block);
    block.remove();
    
    const blockContent = newBlock.querySelector('.block-content');
    if (blockContent) {
        blockContent.focus();
    }
    
    saveCurrentPageContent();
}

// Gerenciamento de páginas
function createNewPage() {
    const pageName = prompt('Nome da nova página:');
    if (pageName && pageName.trim()) {
        const pageId = 'page-' + Date.now();
        pages[pageId] = {
            id: pageId,
            title: pageName.trim(),
            content: [],
            parentId: null,
            children: []
        };
        
        updatePagesList();
        switchToPage(pageId);
        updateAllIndexes();
        updateAllTocs();
    }
}

// Criar nova subpágina
function createNewSubpage() {
    if (!currentPageId) return;
    
    const pageName = prompt('Nome da nova subpágina:');
    if (pageName && pageName.trim()) {
        const pageId = 'page-' + Date.now();
        pages[pageId] = {
            id: pageId,
            title: pageName.trim(),
            content: [],
            parentId: currentPageId,
            children: []
        };
        
        // Adicionar às subpáginas do pai
        if (!pages[currentPageId].children) {
            pages[currentPageId].children = [];
        }
        pages[currentPageId].children.push(pageId);
        
        updatePagesList();
        switchToPage(pageId);
        updateAllIndexes();
        updateAllTocs();
    }
}

function switchToPage(pageId) {
    // Salvar página atual
    saveCurrentPageContent();
    
    // Mudar para nova página
    currentPageId = pageId;
    const page = pages[pageId];
    
    // Atualizar título
    const pageTitle = document.querySelector('.page-title');
    pageTitle.textContent = page.title;
    
    // Aplicar dados do cabeçalho
    applyHeaderData(page);
    
    // Limpar editor
    const editorContent = document.getElementById('editor-content');
    editorContent.innerHTML = '';
    
    // Carregar conteúdo ou criar bloco inicial
    if (page.content && page.content.length > 0) {
        page.content.forEach(blockData => {
            // Usar createBlockElementWithData para páginas importadas com dados complexos
            const block = blockData.extraData ? 
                         createBlockElementWithData(blockData) : 
                         createBlockElement(blockData.type, blockData.content);
            
            // Configurar dados específicos do bloco
            if (blockData.type === 'code' && blockData.language) {
                block.setAttribute('data-language', blockData.language);
                const languageSelector = block.querySelector('.code-language-selector');
                if (languageSelector) {
                    languageSelector.value = blockData.language;
                }
                // Configurar conteúdo do editor
                const codeEditor = block.querySelector('.code-editor');
                if (codeEditor) {
                    codeEditor.value = blockData.content;
                }
                // Atualizar preview
                setTimeout(() => {
                    const codeId = block.id;
                    if (codeId) {
                        updateCodePreview(codeId);
                    }
                }, 100);
            } else if (blockData.type === 'toggle' && blockData.nestedBlocks && blockData.nestedBlocks.length > 0) {
                // Carregar blocos aninhados no toggle
                const toggleInnerContent = block.querySelector('.toggle-inner-content');
                const toggleActions = block.querySelector('.toggle-actions');
                
                blockData.nestedBlocks.forEach(nestedBlockData => {
                    const nestedBlock = createBlockElement(nestedBlockData.type, nestedBlockData.content);
                    nestedBlock.classList.add('toggle-nested-block');
                    
                    // Configurar dados específicos para bloco aninhado
                    if (nestedBlockData.type === 'code' && nestedBlockData.language) {
                        nestedBlock.setAttribute('data-language', nestedBlockData.language);
                        const languageSelector = nestedBlock.querySelector('.code-language-selector');
                        if (languageSelector) {
                            languageSelector.value = nestedBlockData.language;
                        }
                        const codeEditor = nestedBlock.querySelector('.code-editor');
                        if (codeEditor) {
                            codeEditor.value = nestedBlockData.content;
                        }
                        setTimeout(() => {
                            const codeId = nestedBlock.id;
                            if (codeId) {
                                updateCodePreview(codeId);
                            }
                        }, 100);
                    } else if (nestedBlockData.type === 'external' && nestedBlockData.content) {
                        // Configurar página externa aninhada
                        const urlInput = nestedBlock.querySelector('.external-url-input');
                        const externalBlock = nestedBlock.querySelector('.external-block');
                        
                        if (urlInput && externalBlock) {
                            urlInput.value = nestedBlockData.content;
                            
                            // Aplicar dimensões salvas no elemento correto (.external-block)
                            if (nestedBlockData.width) {
                                externalBlock.style.width = nestedBlockData.width;
                            }
                            if (nestedBlockData.height) {
                                externalBlock.style.height = nestedBlockData.height;
                            }
                            
                            setTimeout(() => {
                                loadExternalContent(externalBlock.id, nestedBlockData.content);
                            }, 100);
                        }
                    }
                    
                    // Adicionar botão de exclusão para bloco aninhado
                    addDeleteButtonToNestedBlock(nestedBlock);
                    
                    // Inserir antes dos botões de ação
                    toggleInnerContent.insertBefore(nestedBlock, toggleActions);
                });
            } else if (blockData.type === 'image' && blockData.mediaType === 'image') {
                // Carregar imagem
                const mediaBlock = block.querySelector('.media-block');
                if (mediaBlock && blockData.content) {
                    mediaBlock.innerHTML = `
                        <div class="media-content">
                            <img src="${blockData.content}" alt="${blockData.alt || 'Uploaded image'}">
                        </div>
                    `;
                }
            } else if (blockData.type === 'video' && blockData.mediaType === 'video') {
                // Carregar vídeo
                const mediaBlock = block.querySelector('.media-block');
                if (mediaBlock && blockData.content) {
                    mediaBlock.innerHTML = `
                        <div class="media-content">
                            <iframe src="${blockData.content}" allowfullscreen></iframe>
                        </div>
                    `;
                }
            } else if (blockData.type === 'pdf' && blockData.mediaType === 'pdf') {
                // Carregar PDF
                const mediaBlock = block.querySelector('.media-block');
                if (mediaBlock && blockData.content) {
                    mediaBlock.innerHTML = `
                        <div class="media-content">
                            <iframe src="${blockData.content}" type="application/pdf"></iframe>
                        </div>
                    `;
                }
            } else if (blockData.type === 'external' && blockData.content) {
                // Carregar página externa e aplicar dimensões salvas
                const urlInput = block.querySelector('.external-url-input');
                const externalBlock = block.querySelector('.external-block');
                
                if (urlInput && externalBlock) {
                    urlInput.value = blockData.content;
                    
                    // Aplicar dimensões salvas no elemento correto (.external-block)
                    if (blockData.width) {
                        externalBlock.style.width = blockData.width;
                    }
                    if (blockData.height) {
                        externalBlock.style.height = blockData.height;
                    }
                    
                    setTimeout(() => {
                        loadExternalContent(externalBlock.id, blockData.content);
                    }, 100);
                }
            } else if (blockData.type === 'live-code' && blockData.mediaType === 'live-code') {
                // Carregar código interpretável
                const htmlEditor = block.querySelector('[data-lang="html"]');
                const cssEditor = block.querySelector('[data-lang="css"]');
                const jsEditor = block.querySelector('[data-lang="js"]');
                const liveCodeBlock = block.querySelector('.live-code-block');
                const typeSelector = block.querySelector('.live-code-type-selector');
                
                if (liveCodeBlock) {
                    // Aplicar dimensões salvas
                    if (blockData.width) {
                        liveCodeBlock.style.width = blockData.width;
                    }
                    if (blockData.height) {
                        liveCodeBlock.style.height = blockData.height;
                    }
                    
                    // Carregar código nos editores
                    if (htmlEditor) htmlEditor.value = blockData.htmlCode || '';
                    if (cssEditor) cssEditor.value = blockData.cssCode || '';
                    if (jsEditor) jsEditor.value = blockData.jsCode || '';
                    
                    // Configurar tipo
                    if (typeSelector && blockData.codeType) {
                        typeSelector.value = blockData.codeType;
                        changeLiveCodeType(liveCodeBlock.id, blockData.codeType);
                    }
                    
                    // Configurar auto-run
                    if (blockData.autoRun) {
                        toggleAutoRun(liveCodeBlock.id);
                    }
                    
                    // Executar código se houver conteúdo
                    setTimeout(() => {
                        if (blockData.htmlCode || blockData.cssCode || blockData.jsCode) {
                            runLiveCode(liveCodeBlock.id);
                        }
                    }, 200);
                }
            } else if (blockData.type === 'link' && blockData.url) {
                // Carregar link
                block.innerHTML = `
                    <a href="${blockData.url}" target="_blank" class="link-block">
                        <i class="fas fa-external-link-alt link-icon"></i>
                        <div class="link-content">
                            <div class="link-title">${blockData.title || blockData.url}</div>
                            <div class="link-url">${blockData.url}</div>
                        </div>
                    </a>
                `;
            } else if ((blockData.type === 'ul' || blockData.type === 'ol') && blockData.listItems) {
                // Carregar listas hierárquicas
                const listBlock = block.querySelector('.list-block');
                if (listBlock) {
                    const listContent = listBlock.querySelector('.list-content');
                    listContent.innerHTML = ''; // Limpar conteúdo padrão
                    
                    blockData.listItems.forEach(item => {
                        const listItem = document.createElement('div');
                        listItem.className = 'list-item';
                        listItem.setAttribute('data-level', item.level || '0');
                        
                        const listId = listBlock.id;
                        listItem.innerHTML = `
                            <div class="list-marker ${blockData.type}-marker" data-index="1"></div>
                            <div class="list-item-content" contenteditable="true" placeholder="Digite o item da lista...">${item.content || ''}</div>
                            <div class="list-controls">
                                <button class="list-control-btn" onclick="addListItem('${listId}')" title="Adicionar item">
                                    <i class="fas fa-plus"></i>
                                </button>
                                <button class="list-control-btn" onclick="indentListItem(this)" title="Aumentar recuo">
                                    <i class="fas fa-indent"></i>
                                </button>
                                <button class="list-control-btn" onclick="outdentListItem(this)" title="Diminuir recuo">
                                    <i class="fas fa-outdent"></i>
                                </button>
                                <button class="list-control-btn" onclick="removeListItem(this)" title="Remover item">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `;
                        
                        listContent.appendChild(listItem);
                    });
                    
                    // Atualizar marcadores após carregar todos os itens
                    setTimeout(() => {
                        updateListMarkers(listBlock);
                    }, 10);
                }
            }
            
            editorContent.appendChild(block);
        });
    } else {
        const initialBlock = createBlockElement('p');
        editorContent.appendChild(initialBlock);
    }
    
    // Mostrar/esconder botão de nova subpágina
    const newSubpageBtn = document.getElementById('new-subpage-btn');
    newSubpageBtn.style.display = 'block';
    
    // Atualizar lista de páginas
    updatePagesList();
}

function deletePage(pageId, event) {
    event.stopPropagation();
    
    if (Object.keys(pages).length <= 1) {
        alert('Não é possível deletar a última página');
        return;
    }
    
    const page = pages[pageId];
    const hasChildren = page.children && page.children.length > 0;
    
    let confirmMessage = 'Tem certeza que deseja deletar esta página?';
    if (hasChildren) {
        confirmMessage += `\n\nAtenção: Esta página tem ${page.children.length} subpágina(s) que também serão deletadas.`;
    }
    
    if (confirm(confirmMessage)) {
        // Deletar recursivamente subpáginas
        if (hasChildren) {
            page.children.forEach(childId => {
                deletePageRecursive(childId);
            });
        }
        
        // Remover da lista de filhos do pai
        if (page.parentId && pages[page.parentId]) {
            const parentChildren = pages[page.parentId].children;
            const index = parentChildren.indexOf(pageId);
            if (index > -1) {
                parentChildren.splice(index, 1);
            }
        }
        
        delete pages[pageId];
        
        // Se a página deletada era a atual, mudar para outra
        if (currentPageId === pageId) {
            const remainingPages = Object.keys(pages);
            switchToPage(remainingPages[0]);
        } else {
            updatePagesList();
        }
        
        updateAllIndexes();
        updateAllTocs();
    }
}

function deletePageRecursive(pageId) {
    const page = pages[pageId];
    if (!page) return;
    
    // Deletar subpáginas recursivamente
    if (page.children && page.children.length > 0) {
        page.children.forEach(childId => {
            deletePageRecursive(childId);
        });
    }
    
    delete pages[pageId];
}

// Renomear página
function renamePage(pageId, event) {
    event.stopPropagation();
    
    const page = pages[pageId];
    if (!page) return;
    
    const newTitle = prompt('Digite o novo nome da página:', page.title);
    
    if (newTitle !== null && newTitle.trim() !== '' && newTitle !== page.title) {
        page.title = newTitle.trim();
        
        // Atualizar título na interface se for a página atual
        if (pageId === currentPageId) {
            const pageTitle = document.querySelector('.page-title');
            if (pageTitle) {
                pageTitle.textContent = newTitle.trim();
            }
        }
        
        // Atualizar lista de páginas
        updatePagesList();
        
        // Salvar mudanças
        saveCurrentPageContent();
    }
}

function updatePagesList() {
    const pagesList = document.getElementById('pages-list');
    
    // Salvar estado expandido antes de limpar
    const expandedStates = {};
    const subpagesContainers = pagesList.querySelectorAll('.subpages-container');
    subpagesContainers.forEach(container => {
        const pageId = container.id.replace('subpages-', '');
        expandedStates[pageId] = container.classList.contains('expanded');
    });
    
    pagesList.innerHTML = '';
    
    // Obter apenas páginas raiz (sem pai)
    const rootPages = Object.values(pages).filter(page => !page.parentId);
    
    function renderPageItem(page, isSubpage = false) {
        const li = document.createElement('li');
        li.className = 'page-item';
        li.setAttribute('data-page-id', page.id);
        
        if (isSubpage) {
            li.classList.add('subpage');
        }
        
        if (page.id === currentPageId) {
            li.classList.add('active');
        }
        
        const hasChildren = page.children && page.children.length > 0;
        if (hasChildren) {
            li.classList.add('has-subpages');
        }
        
        let expandButton = '';
        if (hasChildren) {
            expandButton = `
                <button class="expand-btn" onclick="toggleSubpages('${page.id}', event)">
                    <i class="fas fa-chevron-right" id="expand-icon-${page.id}"></i>
                </button>
            `;
        }
        
        li.innerHTML = `
            ${expandButton}
            <span class="page-title">
                <span class="page-emoji-small">${page.emoji || '😊'}</span>
                ${page.title}
            </span>
            <div class="page-actions">
                <button class="rename-page" onclick="renamePage('${page.id}', event)" title="Renomear página">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-page" onclick="deletePage('${page.id}', event)" title="Excluir página">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        li.addEventListener('click', (e) => {
            if (!e.target.closest('.expand-btn') && !e.target.closest('.page-actions')) {
                switchToPage(page.id);
            }
        });
        
        pagesList.appendChild(li);
        
        // Renderizar subpáginas
        if (hasChildren) {
            const subpagesContainer = document.createElement('div');
            subpagesContainer.className = 'subpages-container';
            subpagesContainer.id = `subpages-${page.id}`;
            
            page.children.forEach(childId => {
                if (pages[childId]) {
                    renderPageItem(pages[childId], true);
                }
            });
            
            // Mover subpáginas para o container
            const subpageItems = [];
            while (pagesList.children.length > pagesList.children.length - page.children.length) {
                const lastChild = pagesList.lastElementChild;
                if (lastChild !== li) {
                    subpageItems.unshift(lastChild);
                    pagesList.removeChild(lastChild);
                } else {
                    break;
                }
            }
            
            subpageItems.forEach(item => subpagesContainer.appendChild(item));
            pagesList.appendChild(subpagesContainer);
        }
    }
    
    rootPages.forEach(page => renderPageItem(page));
    
    // Restaurar estado expandido
    Object.keys(expandedStates).forEach(pageId => {
        if (expandedStates[pageId]) {
            const subpagesContainer = document.getElementById(`subpages-${pageId}`);
            const expandIcon = document.getElementById(`expand-icon-${pageId}`);
            if (subpagesContainer && expandIcon) {
                subpagesContainer.classList.add('expanded');
                expandIcon.style.transform = 'rotate(90deg)';
            }
        }
    });
}

// Expandir/recolher subpáginas
function toggleSubpages(pageId, event) {
    event.stopPropagation();
    
    const subpagesContainer = document.getElementById(`subpages-${pageId}`);
    const expandIcon = document.getElementById(`expand-icon-${pageId}`);
    
    if (subpagesContainer.classList.contains('expanded')) {
        subpagesContainer.classList.remove('expanded');
        expandIcon.style.transform = 'rotate(0deg)';
    } else {
        subpagesContainer.classList.add('expanded');
        expandIcon.style.transform = 'rotate(90deg)';
    }
}

// Salvar conteúdo da página atual
function saveCurrentPageContent() {
    if (!pages[currentPageId]) return;
    
    const editorContent = document.getElementById('editor-content');
    // Capturar apenas blocos de primeiro nível (filhos diretos), não os aninhados
    const blocks = Array.from(editorContent.children).filter(child => child.classList.contains('block'));
    
    pages[currentPageId].content = blocks.map(block => {
        const blockType = block.getAttribute('data-block-type');
        let content = '';
        let extraData = {};
        
        if (blockType === 'code') {
            // Para blocos de código, salvar o conteúdo do editor
            const codeEditor = block.querySelector('.code-editor');
            const language = block.getAttribute('data-language') || 'javascript';
            content = codeEditor ? codeEditor.value : '';
            extraData = { language: language };
        } else if (blockType === 'toggle') {
            // Para toggles, salvar o título e os blocos aninhados
            const toggleHeader = block.querySelector('.toggle-header .block-content');
            content = toggleHeader ? toggleHeader.innerHTML : '';
            
            // Salvar blocos aninhados
            const nestedBlocks = block.querySelectorAll('.toggle-nested-block');
            const nestedContent = Array.from(nestedBlocks).map(nestedBlock => {
                const nestedType = nestedBlock.getAttribute('data-block-type');
                let nestedBlockContent = '';
                let nestedExtraData = {};
                
                if (nestedType === 'code') {
                    const codeEditor = nestedBlock.querySelector('.code-editor');
                    const language = nestedBlock.getAttribute('data-language') || 'javascript';
                    nestedBlockContent = codeEditor ? codeEditor.value : '';
                    nestedExtraData = { language: language };
                } else if (nestedType === 'toggle') {
                    // Para toggles aninhados, salvar o título e seus próprios blocos aninhados
                    const nestedToggleHeader = nestedBlock.querySelector('.toggle-header .block-content');
                    nestedBlockContent = nestedToggleHeader ? nestedToggleHeader.innerHTML : '';
                    
                    const nestedNestedBlocks = nestedBlock.querySelectorAll('.toggle-nested-block');
                    const nestedNestedContent = Array.from(nestedNestedBlocks).map(nestedNestedBlock => {
                        // Recursão para toggles dentro de toggles
                        const nestedNestedType = nestedNestedBlock.getAttribute('data-block-type');
                        let nestedNestedBlockContent = '';
                        let nestedNestedExtraData = {};
                        
                        if (nestedNestedType === 'code') {
                            const codeEditor = nestedNestedBlock.querySelector('.code-editor');
                            const language = nestedNestedBlock.getAttribute('data-language') || 'javascript';
                            nestedNestedBlockContent = codeEditor ? codeEditor.value : '';
                            nestedNestedExtraData = { language: language };
                        } else {
                            const blockContent = nestedNestedBlock.querySelector('.block-content');
                            nestedNestedBlockContent = blockContent ? blockContent.innerHTML : '';
                        }
                        
                        return {
                            type: nestedNestedType,
                            content: nestedNestedBlockContent,
                            alignment: getBlockAlignment(nestedNestedBlock.querySelector('.block-content')),
                            ...nestedNestedExtraData
                        };
                    });
                    
                    nestedExtraData = { nestedBlocks: nestedNestedContent };
                } else if (nestedType === 'image') {
                    const img = nestedBlock.querySelector('img');
                    nestedBlockContent = img ? img.src : '';
                    nestedExtraData = { 
                        alt: img ? img.alt : '',
                        mediaType: 'image'
                    };
                } else if (nestedType === 'video') {
                    const iframe = nestedBlock.querySelector('iframe');
                    nestedBlockContent = iframe ? iframe.src : '';
                    nestedExtraData = { mediaType: 'video' };
                } else if (nestedType === 'link') {
                    const link = nestedBlock.querySelector('a');
                    if (link) {
                        nestedBlockContent = link.href;
                        nestedExtraData = { 
                            title: link.querySelector('.link-title')?.textContent || '',
                            url: link.href
                        };
                    }
                } else if (nestedType === 'pdf') {
                    const iframe = nestedBlock.querySelector('iframe');
                    nestedBlockContent = iframe ? iframe.src : '';
                    nestedExtraData = { mediaType: 'pdf' };
                } else if (nestedType === 'external') {
                    const urlInput = nestedBlock.querySelector('.external-url-input');
                    nestedBlockContent = urlInput ? urlInput.value : '';
                    
                    // Capturar dimensões do bloco external aninhado
                    const externalBlock = nestedBlock.querySelector('.external-block');
                    const currentWidth = externalBlock ? (externalBlock.style.width || '100%') : '100%';
                    const currentHeight = externalBlock ? (externalBlock.style.height || '400px') : '400px';
                    
                    nestedExtraData = { 
                        mediaType: 'external',
                        width: currentWidth,
                        height: currentHeight
                    };
                } else {
                    const blockContent = nestedBlock.querySelector('.block-content');
                    nestedBlockContent = blockContent ? blockContent.innerHTML : '';
                }
                
                return {
                    type: nestedType,
                    content: nestedBlockContent,
                    alignment: getBlockAlignment(nestedBlock.querySelector('.block-content')),
                    ...nestedExtraData
                };
            });
            
            extraData = { nestedBlocks: nestedContent };
        } else if (blockType === 'external') {
            // Para páginas externas, salvar a URL e dimensões
            const urlInput = block.querySelector('.external-url-input');
            content = urlInput ? urlInput.value : '';
            
            // Capturar dimensões do bloco external (não do bloco container)
            const externalBlock = block.querySelector('.external-block');
            const currentWidth = externalBlock ? (externalBlock.style.width || '100%') : '100%';
            const currentHeight = externalBlock ? (externalBlock.style.height || '400px') : '400px';
            
            extraData = { 
                mediaType: 'external',
                width: currentWidth,
                height: currentHeight
            };
        } else if (blockType === 'live-code') {
            // Para código interpretável, salvar HTML, CSS e JS
            const htmlEditor = block.querySelector('[data-lang="html"]');
            const cssEditor = block.querySelector('[data-lang="css"]');
            const jsEditor = block.querySelector('[data-lang="js"]');
            const liveCodeBlock = block.querySelector('.live-code-block');
            
            // Capturar dimensões
            const currentWidth = liveCodeBlock ? (liveCodeBlock.style.width || '100%') : '100%';
            const currentHeight = liveCodeBlock ? (liveCodeBlock.style.height || '400px') : '400px';
            
            // Capturar configurações
            const typeSelector = block.querySelector('.live-code-type-selector');
            const isAutoRun = liveCodeBlock ? liveCodeBlock.hasAttribute('data-auto-run') : false;
            
            extraData = {
                mediaType: 'live-code',
                htmlCode: htmlEditor ? htmlEditor.value : '',
                cssCode: cssEditor ? cssEditor.value : '',
                jsCode: jsEditor ? jsEditor.value : '',
                codeType: typeSelector ? typeSelector.value : 'html',
                autoRun: isAutoRun,
                width: currentWidth,
                height: currentHeight
            };
            
            // O content será usado como identificador
            content = 'live-code-block';
        } else if (blockType === 'ul' || blockType === 'ol') {
            // Para listas hierárquicas, salvar todos os itens com seus níveis
            const listBlock = block.querySelector('.list-block');
            if (listBlock) {
                const listItems = listBlock.querySelectorAll('.list-item');
                const itemsData = Array.from(listItems).map(item => {
                    const level = item.getAttribute('data-level') || '0';
                    const itemContent = item.querySelector('.list-item-content');
                    return {
                        level: level,
                        content: itemContent ? itemContent.innerHTML : ''
                    };
                });
                
                extraData = { listItems: itemsData };
                content = 'hierarchical-list'; // Identificador para listas hierárquicas
            } else {
                // Fallback para formato antigo
                const blockContent = block.querySelector('.block-content');
                content = blockContent ? blockContent.innerHTML : '';
            }
        } else {
            const blockContent = block.querySelector('.block-content');
            content = blockContent ? blockContent.innerHTML : '';
        }
        
        return {
            type: blockType,
            content: content,
            alignment: getBlockAlignment(block.querySelector('.block-content')),
            ...extraData
        };
    });
    
    // Salvar no localStorage
    localStorage.setItem('notion-editor-pages', JSON.stringify(pages));
    
    // Atualizar índices se houver
    updateAllIndexes();
    updateAllTocs();
}

// Obter alinhamento do bloco
function getBlockAlignment(blockContent) {
    if (!blockContent) return 'left';
    
    if (blockContent.classList.contains('align-center')) return 'center';
    if (blockContent.classList.contains('align-right')) return 'right';
    if (blockContent.classList.contains('align-justify')) return 'justify';
    return 'left';
}

// Carregar páginas do localStorage
function loadPages() {
    const savedPages = localStorage.getItem('notion-editor-pages');
    if (savedPages) {
        const loadedPages = JSON.parse(savedPages);
        
        // Verificar e corrigir estrutura hierárquica se necessário
        Object.values(loadedPages).forEach(page => {
            if (!page.hasOwnProperty('parentId')) {
                page.parentId = null;
            }
            if (!page.hasOwnProperty('children')) {
                page.children = [];
            }
        });
        
        pages = loadedPages;
        updatePagesList();
        
        // Carregar primeira página
        const pageIds = Object.keys(pages);
        if (pageIds.length > 0) {
            switchToPage(pageIds[0]);
        }
    }
}

// Salvar página atual em arquivo
function saveCurrentPage() {
    const page = pages[currentPageId];
    if (!page) return;
    
    saveCurrentPageContent();
    
    // Gerar HTML completo da página atual
    const htmlContent = generatePageHTML(page, true);
    
    // Criar e fazer download do arquivo
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFileName(page.title)}.html`;
    a.click();
    URL.revokeObjectURL(url);
}

// Exportar todas as páginas como ZIP
async function exportAllPages() {
    // Salvar conteúdo atual antes de exportar
    saveCurrentPageContent();
    
    try {
        const zip = new JSZip();
        
        // Adicionar arquivos de recursos
        await addResourceFiles(zip);
        
        // Adicionar apenas as páginas criadas (sem index.html)
        Object.values(pages).forEach(page => {
            const fileName = `${sanitizeFileName(page.title)}.html`;
            const htmlContent = generatePageHTML(page, false);
            zip.file(fileName, htmlContent);
        });
        
        // Gerar e baixar ZIP
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'meu-editor-pages.zip';
        a.click();
        URL.revokeObjectURL(url);
        
        alert('Todas as páginas foram exportadas com sucesso!');
        
    } catch (error) {
        console.error('Erro ao exportar páginas:', error);
        alert('Erro ao exportar páginas: ' + error.message);
    }
}

// Sanitizar nome de arquivo
function sanitizeFileName(filename) {
    return filename.replace(/[^a-z0-9\-_]/gi, '_').toLowerCase();
}

// Gerar HTML completo de uma página
function generatePageHTML(page, standalone = false) {
    const contentHTML = generatePageContentHTML(page);
    const navigationHTML = standalone ? '' : generateNavigationHTML();
    
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.title}</title>
    <link rel="stylesheet" href="styles.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet">
</head>
<body>
    <div class="exported-app">
        ${navigationHTML}
        <main class="exported-main">
            <div class="page-header">
                <!-- Cabeçalho estilo Notion -->
                <div class="notion-header">
                    ${page.coverImage ? `
                    <div class="cover-area">
                        <img src="${page.coverImage}" class="cover-image" alt="Capa da página">
                    </div>
                    ` : ''}
                    
                    <div class="title-section">
                        <span class="page-emoji">${page.emoji || '😊'}</span>
                        <h1 class="page-title">${page.title}</h1>
                    </div>
                </div>
                ${page.parentId ? `<div class="breadcrumb">
                    ${generateBreadcrumb(page)}
                </div>` : ''}
            </div>
            <div class="page-content">
                ${contentHTML}
            </div>
        </main>
    </div>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
    <script src="exported.js"></script>
</body>
</html>`;
}

// Gerar conteúdo HTML da página
function generatePageContentHTML(page) {
    let contentHTML = '';
    const headingCounter = { value: 0 }; // Contador global para headings na página
    
    if (page.content && page.content.length > 0) {
        page.content.forEach(blockData => {
            contentHTML += generateBlockHTML(blockData, headingCounter, page.content);
        });
    } else {
        contentHTML = '<div class="empty-page">Esta página está vazia.</div>';
    }
    
    return contentHTML;
}

// Gerar HTML interno de um bloco aninhado (sem wrapper)
function generateNestedBlockHTML(blockData, headingCounter = { value: 0 }, allBlocks = []) {
    const { type, content, alignment = 'left', language } = blockData;
    let blockHTML = '';
    
    switch (type) {
        case 'h1':
            blockHTML = `<h1 id="heading-${headingCounter.value++}" class="align-${alignment}">${content}</h1>`;
            break;
        case 'h2':
            blockHTML = `<h2 id="heading-${headingCounter.value++}" class="align-${alignment}">${content}</h2>`;
            break;
        case 'h3':
            blockHTML = `<h3 id="heading-${headingCounter.value++}" class="align-${alignment}">${content}</h3>`;
            break;
        case 'p':
            blockHTML = `<div class="block-content align-${alignment}">${content}</div>`;
            break;
        case 'ul':
            blockHTML = exportListBlock(blockData, alignment);
            break;
        case 'ol':
            blockHTML = exportListBlock(blockData, alignment);
            break;
        case 'code':
            const lang = language || 'javascript';
            blockHTML = `
                <div class="code-block" data-language="${lang}">
                    <div class="code-header">
                        <span class="code-language">${lang.toUpperCase()}</span>
                        <button class="code-copy-btn" onclick="copyCode(this)">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                    </div>
                    <div class="code-content">
                        <pre><code class="language-${lang}">${escapeHtml(content)}</code></pre>
                    </div>
                </div>`;
            break;
        case 'toggle':
            // Para toggles aninhados, processar recursivamente
            let nestedToggleContent = '';
            if (blockData.nestedBlocks && blockData.nestedBlocks.length > 0) {
                nestedToggleContent = blockData.nestedBlocks.map(nestedBlock => {
                    const nestedHTML = generateNestedBlockHTML(nestedBlock, headingCounter, allBlocks);
                    return `<div class="block toggle-nested-block" data-block-type="${nestedBlock.type}">${nestedHTML}</div>`;
                }).join('');
            } else {
                nestedToggleContent = '<div class="block-content">Conteúdo do toggle...</div>';
            }
            
            blockHTML = `
                <div class="toggle-block">
                    <div class="toggle-header" onclick="toggleContent(this)">
                        <i class="fas fa-chevron-right toggle-icon"></i>
                        <span>${content}</span>
                    </div>
                    <div class="toggle-content">
                        <div class="toggle-inner-content">
                            ${nestedToggleContent}
                        </div>
                    </div>
                </div>`;
            break;
        case 'image':
            if (blockData.mediaType === 'image' && content) {
                blockHTML = `
                    <div class="media-block">
                        <div class="media-content">
                            <img src="${content}" alt="${blockData.alt || 'Imagem'}" />
                        </div>
                    </div>`;
            } else {
                blockHTML = `
                    <div class="media-block">
                        <div class="media-placeholder">
                            <i class="fas fa-image"></i>
                            <div>Imagem não carregada</div>
                        </div>
                    </div>`;
            }
            break;
        case 'video':
            if (blockData.mediaType === 'video' && content) {
                blockHTML = `
                    <div class="media-block">
                        <div class="media-content">
                            <iframe src="${content}" allowfullscreen></iframe>
                        </div>
                    </div>`;
            } else {
                blockHTML = `
                    <div class="media-block">
                        <div class="media-placeholder">
                            <i class="fas fa-video"></i>
                            <div>Vídeo não carregado</div>
                        </div>
                    </div>`;
            }
            break;
        case 'link':
            if (blockData.url && blockData.title) {
                blockHTML = `
                    <a href="${blockData.url}" target="_blank" class="link-block">
                        <i class="fas fa-external-link-alt link-icon"></i>
                        <div class="link-content">
                            <div class="link-title">${blockData.title}</div>
                            <div class="link-url">${blockData.url}</div>
                        </div>
                    </a>`;
            } else if (content) {
                blockHTML = `
                    <a href="${content}" target="_blank" class="link-block">
                        <i class="fas fa-external-link-alt link-icon"></i>
                        <div class="link-content">
                            <div class="link-title">${content}</div>
                            <div class="link-url">${content}</div>
                        </div>
                    </a>`;
            } else {
                blockHTML = `
                    <div class="media-placeholder">
                        <i class="fas fa-link"></i>
                        <div>Link não configurado</div>
                    </div>`;
            }
            break;
        case 'pdf':
            if (blockData.mediaType === 'pdf' && content) {
                blockHTML = `
                    <div class="media-block">
                        <div class="media-content">
                            <iframe src="${content}" type="application/pdf"></iframe>
                        </div>
                    </div>`;
            } else {
                blockHTML = `
                    <div class="media-block">
                        <div class="media-placeholder">
                            <i class="fas fa-file-pdf"></i>
                            <div>PDF não carregado</div>
                        </div>
                    </div>`;
            }
            break;
        case 'external':
            if (blockData.mediaType === 'external' && content) {
                const embedUrl = convertToEmbedUrl(content);
                const width = blockData.width || '100%';
                const height = blockData.height || '400px';
                
                blockHTML = `
                    <div class="external-block-export" style="width: ${width}; height: ${height}; border: 1px solid #e9e9e7; border-radius: 6px; overflow: hidden;">
                        <div class="external-header-export" style="background: #f7f6f3; padding: 8px 12px; border-bottom: 1px solid #e9e9e7; font-size: 12px; color: #787774;">
                            🌐 Página Externa: ${content}
                        </div>
                        <div class="external-content-export" style="height: calc(100% - 32px);">
                            <iframe src="${embedUrl}" frameborder="0" allowfullscreen style="width: 100%; height: 100%; border: none;"></iframe>
                        </div>
                    </div>`;
            } else {
                blockHTML = `
                    <div class="external-placeholder">
                        <i class="fas fa-external-link-alt"></i>
                        <div>Página externa não configurada</div>
                    </div>`;
            }
            break;
        case 'live-code':
            if (blockData.mediaType === 'live-code') {
                const width = blockData.width || '100%';
                const height = blockData.height || '400px';
                const htmlCode = blockData.htmlCode || '';
                const cssCode = blockData.cssCode || '';
                const jsCode = blockData.jsCode || '';
                
                // Criar documento completo para execução
                const fullDocument = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Código Interpretável</title>
    <style>
        body {
            margin: 0;
            padding: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
        }
        ${cssCode}
    </style>
</head>
<body>
    ${htmlCode}
    <script>
        try {
            ${jsCode}
        } catch (error) {
            console.error('Erro no JavaScript:', error);
            document.body.innerHTML += '<div style="color: red; background: #ffe6e6; padding: 8px; margin: 8px 0; border-radius: 4px; font-family: monospace;"><strong>Erro JavaScript:</strong> ' + error.message + '</div>';
        }
    </script>
</body>
</html>`;
                
                // Gerar conteúdo seamless - CSS inline + HTML + JavaScript
                const uniqueId = `live-code-${Math.random().toString(36).substr(2, 9)}`;
                
                blockHTML = `
                    <div class="live-code-seamless" id="${uniqueId}" style="width: ${width};">
                        <style>
                            #${uniqueId} .live-code-content {
                                ${cssCode}
                            }
                        </style>
                        <div class="live-code-content">
                            ${htmlCode}
                        </div>
                        <script>
                            (function() {
                                try {
                                    ${jsCode}
                                } catch (error) {
                                    console.error('Erro no JavaScript:', error);
                                    const errorDiv = document.createElement('div');
                                    errorDiv.style.cssText = 'color: red; background: #ffe6e6; padding: 8px; margin: 8px 0; border-radius: 4px; font-family: monospace;';
                                    errorDiv.innerHTML = '<strong>Erro JavaScript:</strong> ' + error.message;
                                    document.getElementById('${uniqueId}').appendChild(errorDiv);
                                }
                            })();
                        </script>
                    </div>`;
            } else {
                blockHTML = `
                    <div class="live-code-placeholder">
                        <i class="fas fa-play-circle"></i>
                        <div>Código interpretável vazio</div>
                    </div>`;
            }
            break;
        case 'index':
            blockHTML = `
                <div class="index-block">
                    <div class="index-header">
                        <i class="fas fa-list"></i>
                        Índice de Páginas
                    </div>
                    <div class="index-content">
                        ${generateExportedIndexContent()}
                    </div>
                </div>`;
            break;
        case 'toc':
            blockHTML = `
                <div class="toc-block">
                    <div class="toc-header">
                        <i class="fas fa-list-alt"></i>
                        Índice de Tópicos
                    </div>
                    <div class="toc-content">
                        ${generateExportedTocContent(allBlocks)}
                    </div>
                </div>`;
            break;
        default:
            blockHTML = `<div class="block-content align-${alignment}">${content}</div>`;
    }
    
    return blockHTML;
}

// Gerar HTML de um bloco
function generateBlockHTML(blockData, headingCounter = { value: 0 }, allBlocks = []) {
    const { type, content, alignment = 'left', language } = blockData;
    let blockHTML = '';
    
    switch (type) {
        case 'h1':
            blockHTML = `<h1 id="heading-${headingCounter.value++}" class="align-${alignment}">${content}</h1>`;
            break;
        case 'h2':
            blockHTML = `<h2 id="heading-${headingCounter.value++}" class="align-${alignment}">${content}</h2>`;
            break;
        case 'h3':
            blockHTML = `<h3 id="heading-${headingCounter.value++}" class="align-${alignment}">${content}</h3>`;
            break;
        case 'p':
            blockHTML = `<div class="block-content align-${alignment}">${content}</div>`;
            break;
        case 'ul':
            blockHTML = exportListBlock(blockData, alignment);
            break;
        case 'ol':
            blockHTML = exportListBlock(blockData, alignment);
            break;
        case 'toggle':
            let toggleNestedContent = '';
            if (blockData.nestedBlocks && blockData.nestedBlocks.length > 0) {
                toggleNestedContent = blockData.nestedBlocks.map(nestedBlock => {
                    // Gerar apenas o HTML interno do bloco, sem o wrapper <div class="block">
                    const nestedHTML = generateNestedBlockHTML(nestedBlock, headingCounter, allBlocks);
                    return `<div class="block toggle-nested-block" data-block-type="${nestedBlock.type}">${nestedHTML}</div>`;
                }).join('');
            } else {
                toggleNestedContent = '<div class="block-content">Conteúdo do toggle...</div>';
            }
            
            blockHTML = `
                <div class="toggle-block">
                    <div class="toggle-header" onclick="toggleContent(this)">
                        <i class="fas fa-chevron-right toggle-icon"></i>
                        <span>${content}</span>
                    </div>
                    <div class="toggle-content">
                        <div class="toggle-inner-content">
                            ${toggleNestedContent}
                        </div>
                    </div>
                </div>`;
            break;
        case 'code':
            const lang = language || 'javascript';
            blockHTML = `
                <div class="code-block" data-language="${lang}">
                    <div class="code-header">
                        <span class="code-language">${lang.toUpperCase()}</span>
                        <button class="code-copy-btn" onclick="copyCode(this)">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                    </div>
                    <div class="code-content">
                        <pre><code class="language-${lang}">${escapeHtml(content)}</code></pre>
                    </div>
                </div>`;
            break;
        case 'image':
            if (blockData.mediaType === 'image' && content) {
                blockHTML = `
                    <div class="media-block">
                        <div class="media-content">
                            <img src="${content}" alt="${blockData.alt || 'Imagem'}" />
                        </div>
                    </div>`;
            } else {
                blockHTML = `
                    <div class="media-block">
                        <div class="media-placeholder">
                            <i class="fas fa-image"></i>
                            <div>Imagem não carregada</div>
                        </div>
                    </div>`;
            }
            break;
        case 'video':
            if (blockData.mediaType === 'video' && content) {
                blockHTML = `
                    <div class="media-block">
                        <div class="media-content">
                            <iframe src="${content}" allowfullscreen></iframe>
                        </div>
                    </div>`;
            } else {
                blockHTML = `
                    <div class="media-block">
                        <div class="media-placeholder">
                            <i class="fas fa-video"></i>
                            <div>Vídeo não carregado</div>
                        </div>
                    </div>`;
            }
            break;
        case 'link':
            if (blockData.url && blockData.title) {
                blockHTML = `
                    <a href="${blockData.url}" target="_blank" class="link-block">
                        <i class="fas fa-external-link-alt link-icon"></i>
                        <div class="link-content">
                            <div class="link-title">${blockData.title}</div>
                            <div class="link-url">${blockData.url}</div>
                        </div>
                    </a>`;
            } else if (content) {
                blockHTML = `
                    <a href="${content}" target="_blank" class="link-block">
                        <i class="fas fa-external-link-alt link-icon"></i>
                        <div class="link-content">
                            <div class="link-title">${content}</div>
                            <div class="link-url">${content}</div>
                        </div>
                    </a>`;
            } else {
                blockHTML = `
                    <div class="media-placeholder">
                        <i class="fas fa-link"></i>
                        <div>Link não configurado</div>
                    </div>`;
            }
            break;
        case 'pdf':
            if (blockData.mediaType === 'pdf' && content) {
                blockHTML = `
                    <div class="media-block">
                        <div class="media-content">
                            <iframe src="${content}" type="application/pdf"></iframe>
                        </div>
                    </div>`;
            } else {
                blockHTML = `
                    <div class="media-block">
                        <div class="media-placeholder">
                            <i class="fas fa-file-pdf"></i>
                            <div>PDF não carregado</div>
                        </div>
                    </div>`;
            }
            break;
        case 'external':
            if (blockData.mediaType === 'external' && content) {
                const embedUrl = convertToEmbedUrl(content);
                const width = blockData.width || '100%';
                const height = blockData.height || '400px';
                
                blockHTML = `
                    <div class="external-block-export" style="width: ${width}; height: ${height}; border: 1px solid #e9e9e7; border-radius: 6px; overflow: hidden;">
                        <div class="external-header-export" style="background: #f7f6f3; padding: 8px 12px; border-bottom: 1px solid #e9e9e7; font-size: 12px; color: #787774;">
                            🌐 Página Externa: ${content}
                        </div>
                        <div class="external-content-export" style="height: calc(100% - 32px);">
                            <iframe src="${embedUrl}" frameborder="0" allowfullscreen style="width: 100%; height: 100%; border: none;"></iframe>
                        </div>
                    </div>`;
            } else {
                blockHTML = `
                    <div class="external-placeholder">
                        <i class="fas fa-external-link-alt"></i>
                        <div>Página externa não configurada</div>
                    </div>`;
            }
            break;
        case 'live-code':
            if (blockData.mediaType === 'live-code') {
                const width = blockData.width || '100%';
                const height = blockData.height || '400px';
                const htmlCode = blockData.htmlCode || '';
                const cssCode = blockData.cssCode || '';
                const jsCode = blockData.jsCode || '';
                
                // Criar documento completo para execução
                const fullDocument = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Código Interpretável</title>
    <style>
        body {
            margin: 0;
            padding: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
        }
        ${cssCode}
    </style>
</head>
<body>
    ${htmlCode}
    <script>
        try {
            ${jsCode}
        } catch (error) {
            console.error('Erro no JavaScript:', error);
            document.body.innerHTML += '<div style="color: red; background: #ffe6e6; padding: 8px; margin: 8px 0; border-radius: 4px; font-family: monospace;"><strong>Erro JavaScript:</strong> ' + error.message + '</div>';
        }
    </script>
</body>
</html>`;
                
                // Gerar conteúdo seamless - CSS inline + HTML + JavaScript
                const uniqueId = `live-code-${Math.random().toString(36).substr(2, 9)}`;
                
                blockHTML = `
                    <div class="live-code-seamless" id="${uniqueId}" style="width: ${width};">
                        <style>
                            #${uniqueId} .live-code-content {
                                ${cssCode}
                            }
                        </style>
                        <div class="live-code-content">
                            ${htmlCode}
                        </div>
                        <script>
                            (function() {
                                try {
                                    ${jsCode}
                                } catch (error) {
                                    console.error('Erro no JavaScript:', error);
                                    const errorDiv = document.createElement('div');
                                    errorDiv.style.cssText = 'color: red; background: #ffe6e6; padding: 8px; margin: 8px 0; border-radius: 4px; font-family: monospace;';
                                    errorDiv.innerHTML = '<strong>Erro JavaScript:</strong> ' + error.message;
                                    document.getElementById('${uniqueId}').appendChild(errorDiv);
                                }
                            })();
                        </script>
                    </div>`;
            } else {
                blockHTML = `
                    <div class="live-code-placeholder">
                        <i class="fas fa-play-circle"></i>
                        <div>Código interpretável vazio</div>
                    </div>`;
            }
            break;
        case 'index':
            blockHTML = `
                <div class="index-block">
                    <div class="index-header">
                        <i class="fas fa-list"></i>
                        Índice de Páginas
                    </div>
                    <div class="index-content">
                        ${generateExportedIndexContent()}
                    </div>
                </div>`;
            break;
        case 'toc':
            blockHTML = `
                <div class="toc-block">
                    <div class="toc-header">
                        <i class="fas fa-list-alt"></i>
                        Índice de Tópicos
                    </div>
                    <div class="toc-content">
                        ${generateExportedTocContent(allBlocks)}
                    </div>
                </div>`;
            break;
        default:
            blockHTML = `<div class="block-content align-${alignment}">${content}</div>`;
    }
    
    return `<div class="block" data-block-type="${type}">${blockHTML}</div>`;
}

// Gerar navegação para páginas exportadas
function generateNavigationHTML() {
    const rootPages = Object.values(pages).filter(page => !page.parentId);
    
    function renderNavTree(page, level = 0) {
        const fileName = `${sanitizeFileName(page.title)}.html`;
        const indent = '  '.repeat(level);
        const pageEmoji = page.emoji ? `${page.emoji} ` : '';
        let html = `${indent}<li class="nav-item${level > 0 ? ' nav-subitem' : ''}">
            <a href="${fileName}" class="nav-link">
                ${level > 0 ? '└ ' : ''}${pageEmoji}${page.title}
            </a>`;
        
        if (page.children && page.children.length > 0) {
            html += `\n${indent}  <ul class="nav-submenu">`;
            page.children.forEach(childId => {
                if (pages[childId]) {
                    html += '\n' + renderNavTree(pages[childId], level + 1);
                }
            });
            html += `\n${indent}  </ul>`;
        }
        
        html += `\n${indent}</li>`;
        return html;
    }
    
    let navHTML = `
        <nav class="exported-nav">
            <div class="nav-header">
                <h2>📝 Páginas</h2>
            </div>
            <ul class="nav-menu">`;
    
    rootPages.forEach(page => {
        navHTML += '\n' + renderNavTree(page);
    });
    
    navHTML += `
            </ul>
        </nav>`;
    
    return navHTML;
}

// Esta função foi removida - não criamos mais index.html
// As páginas são geradas individualmente usando generatePageHTML()

// Gerar lista de páginas para sidebar exportada
function generateExportedPagesList() {
    const rootPages = Object.values(pages).filter(page => !page.parentId);
    
    function renderPageItem(page, level = 0) {
        const fileName = `${sanitizeFileName(page.title)}.html`;
        const isCurrentPage = page.id === currentPageId;
        const className = `page-item${level > 0 ? ' subpage' : ''}${isCurrentPage ? ' active' : ''}`;
        
        let html = `<li class="${className}" data-page-id="${page.id}">`;
        
        // Botão de expansão se tiver subpáginas
        if (page.children && page.children.length > 0) {
            html += `<button class="expand-btn" onclick="toggleSubpages('${page.id}', event)">
                <i class="fas fa-chevron-right" id="expand-icon-${page.id}"></i>
            </button>`;
        }
        
        html += `<span class="page-title">
            <a href="${fileName}" class="page-link">${page.title}</a>
        </span>
        </li>`;
        
        // Renderizar subpáginas
        if (page.children && page.children.length > 0) {
            html += `<div class="subpages-container expanded" id="subpages-${page.id}">`;
            page.children.forEach(childId => {
                if (pages[childId]) {
                    html += renderPageItem(pages[childId], level + 1);
                }
            });
            html += `</div>`;
        }
        
        return html;
    }
    
    return rootPages.map(page => renderPageItem(page)).join('');
}

// Gerar breadcrumb para página
function generateBreadcrumb(page) {
    const breadcrumbs = [];
    let currentPage = page;
    
    while (currentPage.parentId && pages[currentPage.parentId]) {
        currentPage = pages[currentPage.parentId];
        breadcrumbs.unshift(currentPage);
    }
    
    return breadcrumbs.map(p => 
        `<a href="${sanitizeFileName(p.title)}.html">${p.title}</a>`
    ).join(' > ');
}

// Gerar conteúdo do índice para páginas exportadas
function generateExportedIndexContent() {
    const rootPages = Object.values(pages).filter(page => !page.parentId);
    
    function renderPageTree(page, level = 0) {
        const fileName = `${sanitizeFileName(page.title)}.html`;
        const className = level > 0 ? 'index-item subpage' : 'index-item';
        
        let html = `
            <div class="${className}">
                <i class="fas fa-file-alt index-item-icon"></i>
                <a href="${fileName}">${page.title}</a>
            </div>`;
        
        if (page.children && page.children.length > 0) {
            page.children.forEach(childId => {
                if (pages[childId]) {
                    html += renderPageTree(pages[childId], level + 1);
                }
            });
        }
        
        return html;
    }
    
    return rootPages.map(page => renderPageTree(page)).join('');
}

// Extrair todos os headings de uma página (incluindo os aninhados em toggles)
function extractAllHeadings(blocks) {
    const headings = [];
    
    function processBlock(block) {
        if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
            headings.push(block);
        }
        
        // Processar blocos aninhados em toggles
        if (block.type === 'toggle' && block.nestedBlocks) {
            block.nestedBlocks.forEach(nestedBlock => {
                processBlock(nestedBlock);
            });
        }
    }
    
    blocks.forEach(processBlock);
    return headings;
}

// Gerar conteúdo exportado do índice de tópicos
function generateExportedTocContent(allBlocks) {
    if (!allBlocks) return '<div class="toc-empty">Nenhum tópico encontrado</div>';
    
    const headings = extractAllHeadings(allBlocks);
    
    if (headings.length === 0) {
        return '<div class="toc-empty">Nenhum tópico encontrado</div>';
    }
    
    let tocHTML = '';
    
    headings.forEach((heading, index) => {
        const level = heading.type;
        const text = heading.content.trim();
        const headingId = `heading-${index}`;
        
        // Escapar o texto para HTML
        const escapedText = escapeHtml(text);
        
        const className = `toc-item toc-${level}`;
        const indent = level === 'h1' ? '0px' : level === 'h2' ? '20px' : '40px';
        
        tocHTML += `
            <div class="${className}" onclick="document.getElementById('${headingId}').scrollIntoView({behavior: 'smooth', block: 'start'})" style="margin-left: ${indent}; cursor: pointer;">
                <i class="fas fa-${level === 'h1' ? 'heading' : level === 'h2' ? 'chevron-right' : 'dot-circle'} toc-item-icon"></i>
                ${escapedText}
            </div>
        `;
    });
    
    return tocHTML;
}

// Escapar HTML
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Adicionar arquivos de recursos ao ZIP
async function addResourceFiles(zip) {
    // Adicionar CSS
    const css = generateExportedCSS();
    zip.file('styles.css', css);
    
    // Adicionar JavaScript
    const js = generateExportedJS();
    zip.file('exported.js', js);
}

// Gerar CSS para páginas exportadas
function generateExportedCSS() {
    return `/* CSS Exportado do Meu Editor */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #37352f;
    background-color: #ffffff;
}

/* Estilos principais da aplicação */
.app {
    display: flex;
    height: 100vh;
}

.exported-app {
    display: flex;
    min-height: 100vh;
}

/* Sidebar para páginas exportadas */
.sidebar {
    width: 260px;
    background-color: #f7f6f3;
    border-right: 1px solid #e9e9e7;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
}

.sidebar-header {
    padding: 16px;
    border-bottom: 1px solid #e9e9e7;
}

.sidebar-header h2 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
    color: #37352f;
}

.export-info {
    color: #9b9a97;
    font-style: italic;
}

.pages-nav {
    flex: 1;
    overflow-y: auto;
}

.pages-list {
    list-style: none;
    padding: 8px;
}

.page-item {
    padding: 4px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 14px;
    color: #787774;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
}

.page-item:hover {
    background-color: #ededec;
}

.page-item.active {
    background-color: #2383e2;
    color: white;
}

.page-item.subpage {
    margin-left: 20px;
    position: relative;
}

.page-item.subpage:before {
    content: "";
    position: absolute;
    left: -15px;
    top: 50%;
    width: 10px;
    height: 1px;
    background-color: #d3d1cb;
}

.page-item.subpage .page-title:before {
    content: "└ ";
    color: #9b9a97;
    margin-right: 4px;
}

.page-item .expand-btn {
    opacity: 0;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 2px;
    border-radius: 2px;
    margin-right: 4px;
    transition: opacity 0.2s;
}

.page-item:hover .expand-btn {
    opacity: 1;
}

.page-item.has-subpages > .expand-btn {
    opacity: 1;
}

.subpages-container {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out;
}

.subpages-container.expanded {
    max-height: 500px;
}

.page-link {
    color: inherit;
    text-decoration: none;
    flex: 1;
}

.page-link:hover {
    text-decoration: underline;
}

.exported-nav {
    width: 260px;
    background-color: #f7f6f3;
    border-right: 1px solid #e9e9e7;
    padding: 16px;
    overflow-y: auto;
}

.nav-header {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e9e9e7;
}

.nav-header h2 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
}

.nav-menu {
    list-style: none;
}

.nav-item {
    margin-bottom: 4px;
}

.nav-subitem {
    margin-left: 16px;
}

.nav-link {
    display: block;
    padding: 4px 8px;
    color: #37352f;
    text-decoration: none;
    border-radius: 3px;
    transition: background-color 0.2s;
}

.nav-link:hover {
    background-color: #ededec;
}

/* Editor container para páginas exportadas */
.editor-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.exported-editor {
    flex: 1;
    padding: 40px 96px 40px 40px;
    overflow-y: auto;
    background-color: #ffffff;
}

.page-title-container {
    margin-bottom: 20px;
}

.page-title-display {
    font-size: 40px;
    font-weight: 700;
    line-height: 1.2;
    color: #37352f;
    margin-bottom: 0;
}

.exported-content {
    min-height: 500px;
}

.exported-main {
    flex: 1;
    padding: 40px;
    overflow-y: auto;
}

.page-header {
    margin-bottom: 32px;
}

.page-title {
    font-size: 36px;
    font-weight: 700;
    margin-bottom: 8px;
    color: #37352f;
}

.breadcrumb {
    font-size: 14px;
    color: #9b9a97;
}

.breadcrumb a {
    color: #2383e2;
    text-decoration: none;
}

.page-content {
    width: 100%;
    max-width: none;
}

.block {
    margin-bottom: 8px;
}

.block-content {
    font-size: 16px;
    line-height: 1.6;
    margin: 4px 0;
}

/* Alinhamentos */
.align-left { text-align: left; }
.align-center { text-align: center; }
.align-right { text-align: right; }
.align-justify { text-align: justify; }

/* Títulos */
h1 { font-size: 32px; font-weight: 700; margin: 16px 0 8px 0; }
h2 { font-size: 24px; font-weight: 600; margin: 12px 0 6px 0; }
h3 { font-size: 20px; font-weight: 600; margin: 8px 0 4px 0; }

/* Listas */
.list-item {
    margin: 4px 0;
    padding-left: 20px;
    position: relative;
}

.list-item.numbered {
    counter-increment: list-counter;
}

.list-item.numbered:before {
    content: counter(list-counter) ".";
    position: absolute;
    left: 0;
    font-weight: bold;
}

/* Toggle */
.toggle-block {
    border: 1px solid #e9e9e7;
    border-radius: 6px;
    margin: 12px 0;
}

.toggle-header {
    padding: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    background-color: #f7f6f3;
}

.toggle-icon {
    margin-right: 8px;
    transition: transform 0.2s;
}

.toggle-content {
    padding: 12px;
    display: none;
}

.toggle-block.expanded .toggle-content {
    display: block;
}

.toggle-block.expanded .toggle-icon {
    transform: rotate(90deg);
}

.toggle-inner-content {
    padding: 8px 0;
}

.toggle-nested-block {
    margin: 8px 0;
    padding-left: 16px;
    border-left: 2px solid #e9e9e7;
}

/* CSS adicional para páginas exportadas - suporte para todos os tipos de mídia */
.media-block {
    margin: 16px 0;
    border: 1px solid #e9e9e7;
    border-radius: 6px;
    overflow: hidden;
}

.media-content {
    position: relative;
}

.media-content img {
    width: 100%;
    height: auto;
    display: block;
}

.media-content iframe {
    width: 100%;
    height: 300px;
    border: none;
}

.media-placeholder {
    padding: 40px;
    text-align: center;
    color: #9b9a97;
    background-color: #fafafa;
    font-style: italic;
}

.link-block {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    margin: 8px 0;
    background-color: #fafafa;
    border: 1px solid #e9e9e7;
    border-radius: 6px;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s;
}

.link-block:hover {
    background-color: #f1f1ef;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.link-icon {
    margin-right: 12px;
    color: #2383e2;
}

.link-content {
    flex: 1;
}

.link-title {
    font-weight: 600;
    margin-bottom: 2px;
}

.link-url {
    font-size: 13px;
    color: #9b9a97;
    word-break: break-all;
}

/* Código */
.code-block {
    border: 1px solid #e9e9e7;
    border-radius: 6px;
    margin: 16px 0;
    background-color: #f8f8f8;
    overflow: hidden;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: #f1f1f1;
    border-bottom: 1px solid #e9e9e7;
    font-size: 12px;
}

.code-language {
    font-weight: 600;
    color: #37352f;
}

.code-copy-btn {
    background: none;
    border: none;
    color: #787774;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 3px;
    font-size: 12px;
    transition: all 0.2s;
}

.code-copy-btn:hover {
    background-color: #e9e9e7;
    color: #37352f;
}

.code-content pre {
    margin: 0;
    padding: 12px;
    background: transparent;
    font-size: 14px;
    line-height: 1.4;
    overflow-x: auto;
}

.code-content code {
    font-family: inherit;
}

/* Índice */
.index-block {
    border: 1px solid #e9e9e7;
    border-radius: 6px;
    margin: 16px 0;
    background-color: #fafafa;
    overflow: hidden;
}

.index-header {
    padding: 12px 16px;
    background-color: #f7f6f3;
    border-bottom: 1px solid #e9e9e7;
    font-weight: 600;
    font-size: 14px;
    color: #37352f;
    display: flex;
    align-items: center;
    gap: 8px;
}

.index-content {
    padding: 12px 16px;
}

.index-item {
    display: flex;
    align-items: center;
    padding: 4px 0;
    margin: 0 -4px;
    padding: 4px;
    border-radius: 3px;
    transition: background-color 0.2s;
}

.index-item:hover {
    background-color: #f1f1ef;
}

.index-item.subpage {
    margin-left: 16px;
    font-size: 14px;
    color: #787774;
}

.index-item-icon {
    width: 16px;
    height: 16px;
    margin-right: 8px;
    color: #9b9a97;
}

.index-item a {
    color: inherit;
    text-decoration: none;
}

.index-item a:hover {
    text-decoration: underline;
}

/* Página de índice */
.index-page {
    width: 100%;
    margin: 0 auto;
    padding: 40px 20px;
}

.index-header {
    text-align: center;
    margin-bottom: 40px;
}

.index-header h1 {
    font-size: 48px;
    margin-bottom: 8px;
}

.index-header p {
    color: #9b9a97;
    font-size: 18px;
}

.page-card {
    border: 1px solid #e9e9e7;
    border-radius: 6px;
    padding: 20px;
    margin: 16px 0;
    background-color: #ffffff;
    transition: all 0.2s;
}

.page-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
}

.page-card h3 {
    margin-bottom: 8px;
}

.page-card a {
    color: #2383e2;
    text-decoration: none;
}

.page-card a:hover {
    text-decoration: underline;
}

.page-card p {
    color: #9b9a97;
    font-size: 14px;
}

.empty-page {
    color: #9b9a97;
    font-style: italic;
    text-align: center;
    padding: 40px 20px;
}

/* Responsive */
@media (max-width: 768px) {
    .exported-app {
        flex-direction: column;
    }
    
    .exported-nav {
        width: 100%;
        max-height: 200px;
    }
    
    .exported-main {
        padding: 20px;
    }
    
    .page-title {
        font-size: 28px;
    }
}

/* Cores por linguagem */
.code-block[data-language="javascript"] .code-header {
    border-left: 4px solid #f7df1e;
}

.code-block[data-language="python"] .code-header {
    border-left: 4px solid #3776ab;
}

.code-block[data-language="html"] .code-header {
    border-left: 4px solid #e34c26;
}

.code-block[data-language="css"] .code-header {
    border-left: 4px solid #1572b6;
}

.code-block[data-language="json"] .code-header {
    border-left: 4px solid #000000;
}

.code-block[data-language="sql"] .code-header {
    border-left: 4px solid #4479a1;
}

.code-block[data-language="php"] .code-header {
    border-left: 4px solid #777bb4;
}

.code-block[data-language="java"] .code-header {
    border-left: 4px solid #ed8b00;
}

.code-block[data-language="csharp"] .code-header {
    border-left: 4px solid #239120;
}

.code-block[data-language="cpp"] .code-header {
    border-left: 4px solid #00599c;
}

/* Responsividade para páginas exportadas */
@media (max-width: 768px) {
    .exported-app {
        flex-direction: column;
    }
    
    .sidebar {
        width: 100%;
        height: auto;
        max-height: 200px;
        overflow-y: auto;
    }
    
    .main-content {
        padding: 15px;
    }
    
    .page-content {
        width: 100%;
        padding: 0;
    }
    
    .block {
        margin-bottom: 12px;
    }
    
    /* Páginas externas responsivas em mobile */
    .external-block-export {
        width: 100% !important;
        min-height: 250px !important;
        max-width: 100%;
    }
    
    /* Código responsivo em mobile */
    .code-block {
        width: 100% !important;
        max-width: 100%;
    }
    
    /* Ajustes gerais para mobile */
    .toggle-block,
    .media-block,
    .link-block,
    .index-block {
        width: 100%;
        max-width: 100%;
    }
    
    /* Tabelas e iframes responsivos */
    .external-content-export iframe {
        width: 100%;
        height: 100%;
    }
}

@media (min-width: 769px) and (max-width: 1200px) {
    .main-content {
        padding: 20px 30px;
    }
    
    .page-content {
        width: 100%;
        padding: 0 20px;
    }
}

@media (min-width: 1201px) {
    .main-content {
        padding: 20px 40px;
    }
    
    .page-content {
        width: 100%;
        padding: 0 40px;
    }
    
    /* Em telas grandes, permitir largura total */
    .external-block-export,
    .code-block,
    .toggle-block,
    .media-block {
        max-width: 100%;
    }
}

/* Remover markers de listas em páginas exportadas */
ul, ol, li {
    list-style: none !important;
    list-style-type: none !important;
}

ul::marker, ol::marker, li::marker {
    content: none !important;
    display: none !important;
}

.nav-item {
    list-style: none !important;
    list-style-type: none !important;
}

.nav-item::marker {
    content: none !important;
    display: none !important;
}

.nav-subitem {
    list-style: none !important;
    list-style-type: none !important;
}

.nav-subitem::marker {
    content: none !important;
    display: none !important;
}

/* Estilos para listas hierárquicas exportadas */
.exported-list-block {
    margin: 16px 0;
}

.exported-list-item {
    display: flex;
    align-items: flex-start;
    margin: 4px 0;
    line-height: 1.6;
}

.exported-list-item[data-level="0"] { margin-left: 0; }
.exported-list-item[data-level="1"] { margin-left: 24px; }
.exported-list-item[data-level="2"] { margin-left: 48px; }
.exported-list-item[data-level="3"] { margin-left: 72px; }
.exported-list-item[data-level="4"] { margin-left: 96px; }
.exported-list-item[data-level="5"] { margin-left: 120px; }

.exported-list-marker {
    min-width: 24px;
    margin-right: 8px;
    font-weight: 500;
    color: #37352f;
    user-select: none;
    flex-shrink: 0;
}

.ul-list .exported-list-marker {
    color: #2383e2;
    font-size: 16px;
}

.ol-list .exported-list-marker {
    font-family: 'Times New Roman', serif;
    font-weight: 600;
}

.exported-list-content {
    flex: 1;
    color: #37352f;
}

/* Cabeçalho Notion Exportado */
.notion-header {
    margin-bottom: 40px;
}

.cover-area {
    width: 100%;
    height: 200px;
    margin-bottom: 30px;
    border-radius: 8px;
    overflow: hidden;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    position: relative;
}

.cover-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.title-section {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
}

.page-emoji {
    font-size: 48px;
    color: #37352f;
    flex-shrink: 0;
}

.page-title {
    font-size: 40px;
    font-weight: 700;
    color: #37352f;
    flex: 1;
    line-height: 1.2;
    margin: 0;
}

/* Emojis na navegação */
.nav-link {
    display: flex;
    align-items: center;
    font-size: 14px;
    line-height: 1.2;
}`;
}

// Gerar JavaScript para páginas exportadas
function generateExportedJS() {
    return `/* JavaScript Exportado do Meu Editor */

// Alternar conteúdo do toggle
function toggleContent(toggleHeader) {
    const toggleBlock = toggleHeader.closest('.toggle-block');
    const toggleContent = toggleBlock.querySelector('.toggle-content');
    const toggleIcon = toggleHeader.querySelector('.toggle-icon');
    
    if (toggleBlock.classList.contains('expanded')) {
        toggleBlock.classList.remove('expanded');
        toggleIcon.style.transform = 'rotate(0deg)';
        toggleContent.style.display = 'none';
    } else {
        toggleBlock.classList.add('expanded');
        toggleIcon.style.transform = 'rotate(90deg)';
        toggleContent.style.display = 'block';
        
        // Aplicar syntax highlighting se Prism estiver disponível em blocos de código aninhados
        if (window.Prism) {
            const codeBlocks = toggleContent.querySelectorAll('code[class*="language-"]');
            codeBlocks.forEach(codeBlock => {
                Prism.highlightElement(codeBlock);
            });
        }
    }
}

// Copiar código para clipboard
function copyCode(button) {
    const codeBlock = button.closest('.code-block');
    const codeContent = codeBlock.querySelector('code');
    
    if (codeContent) {
        const text = codeContent.textContent;
        
        // Criar elemento temporário para copiar
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = text;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        
        try {
            document.execCommand('copy');
            
            // Feedback visual
            const span = button.querySelector('span') || button;
            const originalText = span.textContent;
            span.textContent = 'Copiado!';
            button.style.color = '#2ecc71';
            
            setTimeout(() => {
                span.textContent = originalText;
                button.style.color = '';
            }, 2000);
            
        } catch (err) {
            console.error('Erro ao copiar:', err);
        }
        
        document.body.removeChild(tempTextArea);
    }
}


// ================= FUNÇÕES DO CABEÇALHO NOTION =================






// ================= FIM FUNÇÕES CABEÇALHO =================

// Highlight código quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    // Aplicar syntax highlighting se Prism estiver disponível
    if (window.Prism) {
        Prism.highlightAll();
    }
    
    // Configurar contadores para listas numeradas
    let listCounter = 0;
    const numberedLists = document.querySelectorAll('.list-item.numbered');
    numberedLists.forEach((item, index) => {
        item.style.counterReset = index === 0 ? 'list-counter 0' : '';
    });
});

// Expandir/recolher subpáginas na sidebar exportada
function toggleSubpages(pageId, event) {
    if (event) event.stopPropagation();
    
    const subpagesContainer = document.getElementById('subpages-' + pageId);
    const expandIcon = document.getElementById('expand-icon-' + pageId);
    
    if (subpagesContainer && expandIcon) {
        if (subpagesContainer.classList.contains('expanded')) {
            subpagesContainer.classList.remove('expanded');
            expandIcon.style.transform = 'rotate(0deg)';
        } else {
            subpagesContainer.classList.add('expanded');
            expandIcon.style.transform = 'rotate(90deg)';
        }
    }
}

// Smooth scroll para links internos
document.addEventListener('click', function(e) {
    if (e.target.tagName === 'A' && e.target.getAttribute('href').startsWith('#')) {
        e.preventDefault();
        const targetId = e.target.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
        }
    }
});`;
}

// Carregar página de arquivo
function importPages() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.html';
    input.onchange = handleImportFile;
    input.click();
}

function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.name.endsWith('.zip')) {
        importFromZip(file);
    } else if (file.name.endsWith('.html')) {
        importSinglePage(file);
    } else {
        alert('Por favor, selecione um arquivo ZIP (exportação completa) ou HTML (página única).');
    }
}

// Importar múltiplas páginas de um ZIP
async function importFromZip(zipFile) {
    try {
        const zip = new JSZip();
        const zipData = await zip.loadAsync(zipFile);
        
        const importedPages = {};
        const pageFiles = [];
        
        // Encontrar todos os arquivos HTML
        zipData.forEach((filename, file) => {
            if (filename.endsWith('.html') && !filename.startsWith('__MACOSX/')) {
                pageFiles.push({ filename, file });
            }
        });
        
        // Processar cada página
        for (const { filename, file } of pageFiles) {
            const htmlContent = await file.async('string');
            const pageData = parsePageFromHTML(htmlContent, filename);
            
            if (pageData) {
                importedPages[pageData.id] = pageData;
            }
        }
        
        // Reconstruir hierarquia baseada nos nomes dos arquivos
        reconstructPageHierarchy(importedPages);
        
        // Mesclar com páginas existentes
        Object.assign(pages, importedPages);
        
        // Atualizar interface
        updatePagesList();
        
        // Ir para a primeira página importada
        const firstPageId = Object.keys(importedPages)[0];
        if (firstPageId) {
            switchToPage(firstPageId);
        }
        
        alert(`${Object.keys(importedPages).length} página(s) importada(s) com sucesso!`);
        
    } catch (error) {
        alert('Erro ao importar páginas: ' + error.message);
    }
}

// Importar página única
function importSinglePage(htmlFile) {
    handleFileLoad({ target: { files: [htmlFile] } });
}

// Manipular carregamento de arquivo
function handleFileLoad(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                // Criar elemento temporário para analisar HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = e.target.result;
                
                // Extrair título da página
                let title = file.name.replace('.html', '');
                
                // Tentar extrair título do HTML
                const titleElement = tempDiv.querySelector('h1') || 
                                  tempDiv.querySelector('title') || 
                                  tempDiv.querySelector('.page-title') ||
                                  tempDiv.querySelector('.notion-title');
                
                if (titleElement) {
                    title = titleElement.textContent.trim();
                }
                
                // Extrair emoji se presente no header
                let emoji = '📄';
                const emojiElement = tempDiv.querySelector('.page-emoji');
                if (emojiElement) {
                    emoji = emojiElement.textContent.trim();
                }
                
                // Encontrar conteúdo principal
                const contentArea = tempDiv.querySelector('.page-content') || 
                                  tempDiv.querySelector('.editor-content') || 
                                  tempDiv.querySelector('.main-content') ||
                                  tempDiv.querySelector('body') ||
                                  tempDiv;
                
                if (contentArea) {
                    // Criar nova página
                    const pageId = 'page-' + Date.now();
                    pages[pageId] = {
                        id: pageId,
                        title: title,
                        content: [],
                        parentId: null,
                        children: [],
                        emoji: emoji
                    };
                    
                    // Mudar para a nova página
                    switchToPage(pageId);
                    
                    // Converter HTML em blocos editáveis
                    const convertedBlocks = convertHTMLToBlocks(contentArea);
                    
                    // Limpar editor e adicionar blocos convertidos
                    const editorContent = document.getElementById('editor-content');
                    editorContent.innerHTML = '';
                    
                    if (convertedBlocks.length > 0) {
                        convertedBlocks.forEach(blockData => {
                            const block = createBlockElementWithData(blockData);
                            editorContent.appendChild(block);
                            setupBlockEventListeners(block);
                        });
                        
                        // Simular carregamento para processar dados especiais (listas, etc.)
                        pages[pageId].content = convertedBlocks;
                        setTimeout(() => {
                            switchToPage(pageId); // Recarregar para processar dados especiais
                        }, 100);
                        
                    } else {
                        // Fallback: criar um bloco padrão se não conseguir converter
                        const defaultBlock = createBlockElement('p');
                        editorContent.appendChild(defaultBlock);
                        setupBlockEventListeners(defaultBlock);
                    }
                    
                    updatePagesList();
                    
                    alert(`Página "${title}" carregada e convertida para ${convertedBlocks.length} bloco(s) editável(eis)!`);
                } else {
                    alert('Não foi possível encontrar conteúdo válido no arquivo.');
                }
            } catch (error) {
                alert('Erro ao carregar arquivo: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
}

// Funções para gerenciar blocos de código

// Mudar linguagem do código
function changeCodeLanguage(codeId, language) {
    const codeBlock = document.getElementById(codeId);
    if (!codeBlock) return;
    
    // Atualizar atributo data-language
    codeBlock.setAttribute('data-language', language);
    
    // Atualizar preview
    updateCodePreview(codeId);
    
    // Salvar conteúdo
    saveCurrentPageContent();
}

// Atualizar preview do código com syntax highlighting
function updateCodePreview(codeId) {
    const codeBlock = document.getElementById(codeId);
    if (!codeBlock) return;
    
    const editor = codeBlock.querySelector('.code-editor');
    const preview = codeBlock.querySelector('.code-preview pre code');
    const language = codeBlock.getAttribute('data-language') || 'javascript';
    
    if (editor && preview) {
        const code = editor.value;
        
        // Atualizar classe da linguagem
        preview.className = `language-${language}`;
        preview.textContent = code;
        
        // Aplicar syntax highlighting se Prism estiver disponível
        if (window.Prism) {
            Prism.highlightElement(preview);
        }
    }
    
    // Salvar conteúdo automaticamente
    setTimeout(() => {
        saveCurrentPageContent();
    }, 100);
}

// Alternar entre editor e preview
function toggleCodePreview(codeId) {
    const codeBlock = document.getElementById(codeId);
    if (!codeBlock) return;
    
    const previewBtn = codeBlock.querySelector('[onclick*="toggleCodePreview"] span');
    
    if (codeBlock.classList.contains('preview-mode')) {
        codeBlock.classList.remove('preview-mode');
        previewBtn.textContent = 'Preview';
    } else {
        // Atualizar preview antes de mostrar
        updateCodePreview(codeId);
        codeBlock.classList.add('preview-mode');
        previewBtn.textContent = 'Editar';
    }
}

// Copiar código para clipboard
function copyCodeToClipboard(codeId) {
    const codeBlock = document.getElementById(codeId);
    if (!codeBlock) return;
    
    const editor = codeBlock.querySelector('.code-editor');
    const copyBtn = codeBlock.querySelector('.code-copy-btn span');
    const copyIcon = codeBlock.querySelector('.code-copy-btn i');
    
    if (editor) {
        // Criar elemento temporário para copiar
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = editor.value;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        
        try {
            document.execCommand('copy');
            
            // Feedback visual
            copyBtn.textContent = 'Copiado!';
            copyIcon.className = 'fas fa-check';
            codeBlock.querySelector('.code-copy-btn').classList.add('copied');
            
            setTimeout(() => {
                copyBtn.textContent = 'Copiar';
                copyIcon.className = 'fas fa-copy';
                codeBlock.querySelector('.code-copy-btn').classList.remove('copied');
            }, 2000);
            
        } catch (err) {
            console.error('Erro ao copiar:', err);
            copyBtn.textContent = 'Erro';
            setTimeout(() => {
                copyBtn.textContent = 'Copiar';
            }, 2000);
        }
        
        document.body.removeChild(tempTextArea);
    }
}

// Configurar listeners para blocos de código
function setupCodeBlockListeners(block) {
    const editor = block.querySelector('.code-editor');
    if (editor) {
        // Remover auto-resize nativo para usar o redimensionamento customizado
        
        // Suporte para Tab no editor
        editor.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.selectionStart;
                const end = this.selectionEnd;
                
                // Inserir tab
                this.value = this.value.substring(0, start) + '\t' + this.value.substring(end);
                this.selectionStart = this.selectionEnd = start + 1;
                
                // Trigger input event para atualizar preview
                this.dispatchEvent(new Event('input'));
            }
        });
        
        // Atualizar preview inicial
        const codeId = block.id;
        if (codeId) {
            setTimeout(() => {
                updateCodePreview(codeId);
            }, 100);
        }
        
        // Configurar redimensionamento inicial se necessário
        if (block.classList.contains('resizable-code')) {
            const currentHeight = block.style.height || '200px';
            const headerHeight = block.querySelector('.code-header')?.offsetHeight || 40;
            editor.style.height = `calc(${currentHeight} - ${headerHeight}px - 24px)`;
        }
    }
}

// Adicionar tema escuro para código
function toggleCodeTheme(codeId) {
    const codeBlock = document.getElementById(codeId);
    if (!codeBlock) return;
    
    codeBlock.classList.toggle('dark-theme');
}

// Exportar código como arquivo
function exportCode(codeId) {
    const codeBlock = document.getElementById(codeId);
    if (!codeBlock) return;
    
    const editor = codeBlock.querySelector('.code-editor');
    const language = codeBlock.getAttribute('data-language') || 'txt';
    
    if (editor) {
        const code = editor.value;
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Determinar extensão do arquivo
        const extensions = {
            'javascript': 'js',
            'typescript': 'ts',
            'python': 'py',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'sql': 'sql',
            'php': 'php',
            'java': 'java',
            'csharp': 'cs',
            'cpp': 'cpp',
            'bash': 'sh',
            'markdown': 'md',
            'xml': 'xml',
            'yaml': 'yml',
            'plaintext': 'txt'
        };
        
        const extension = extensions[language] || 'txt';
        a.download = `code.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Variáveis globais para redimensionamento
let isResizing = false;
let currentResizeTarget = null;
let resizeDirection = null;
let startX, startY, startWidth, startHeight;

// Iniciar redimensionamento
function startResize(event, codeId, direction) {
    event.preventDefault();
    event.stopPropagation();
    
    isResizing = true;
    currentResizeTarget = document.getElementById(codeId);
    resizeDirection = direction;
    
    startX = event.clientX;
    startY = event.clientY;
    
    const rect = currentResizeTarget.getBoundingClientRect();
    startWidth = rect.width;
    startHeight = rect.height;
    
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    
    // Adicionar classe visual durante o redimensionamento
    currentResizeTarget.classList.add('resizing');
    document.body.style.cursor = getResizeCursor(direction);
    document.body.style.userSelect = 'none';
}

// Manipular redimensionamento
function handleResize(event) {
    if (!isResizing || !currentResizeTarget) return;
    
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    
    // Definir limites
    const minWidth = 300;
    const minHeight = 120;
    const maxWidth = Math.min(window.innerWidth - 100, 1200);
    const maxHeight = window.innerHeight * 5; // Permitir altura bem maior que a tela
    
    let newWidth = startWidth;
    let newHeight = startHeight;
    
    // Calcular novas dimensões baseadas na direção
    if (resizeDirection === 'right' || resizeDirection === 'both') {
        newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX));
    }
    
    if (resizeDirection === 'bottom' || resizeDirection === 'both') {
        newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY));
    }
    
    // Aplicar novas dimensões
    if (resizeDirection === 'right' || resizeDirection === 'both') {
        currentResizeTarget.style.width = newWidth + 'px';
    }
    
    if (resizeDirection === 'bottom' || resizeDirection === 'both') {
        currentResizeTarget.style.height = newHeight + 'px';
        
        // Ajustar altura do textarea também
        const codeEditor = currentResizeTarget.querySelector('.code-editor');
        if (codeEditor) {
            // Subtrair altura do header
            const header = currentResizeTarget.querySelector('.code-header');
            const headerHeight = header ? header.offsetHeight : 0;
            codeEditor.style.height = (newHeight - headerHeight - 24) + 'px'; // 24px para padding
        }
    }
}

// Parar redimensionamento
function stopResize() {
    if (!isResizing) return;
    
    isResizing = false;
    
    if (currentResizeTarget) {
        currentResizeTarget.classList.remove('resizing');
        currentResizeTarget = null;
    }
    
    resizeDirection = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    
    // Salvar alterações
    saveCurrentPageContent();
}

// Obter cursor apropriado para direção do redimensionamento
function getResizeCursor(direction) {
    switch (direction) {
        case 'right': return 'e-resize';
        case 'bottom': return 's-resize';
        case 'both': return 'se-resize';
        default: return 'default';
    }
}

// Funções para páginas externas

// Converter URL para formato embedável
function convertToEmbedUrl(url) {
    if (!url) return '';
    
    // Google Docs
    if (url.includes('docs.google.com/document')) {
        const docId = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
        if (docId) {
            return `https://docs.google.com/document/d/${docId[1]}/edit?usp=sharing&embedded=true`;
        }
    }
    
    // Google Sheets
    if (url.includes('docs.google.com/spreadsheets')) {
        const sheetId = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (sheetId) {
            return `https://docs.google.com/spreadsheets/d/${sheetId[1]}/edit?usp=sharing&embedded=true`;
        }
    }
    
    // Google Slides
    if (url.includes('docs.google.com/presentation')) {
        const slideId = url.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);
        if (slideId) {
            return `https://docs.google.com/presentation/d/${slideId[1]}/edit?usp=sharing&embedded=true`;
        }
    }
    
    // Google Drive files
    if (url.includes('drive.google.com/file')) {
        const fileId = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
        if (fileId) {
            return `https://drive.google.com/file/d/${fileId[1]}/preview`;
        }
    }
    
    // YouTube
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
        const videoId = url.includes('youtu.be/') ? 
            url.split('youtu.be/')[1].split('?')[0] : 
            url.split('v=')[1].split('&')[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Vimeo
    if (url.includes('vimeo.com/')) {
        const videoId = url.split('vimeo.com/')[1];
        return `https://player.vimeo.com/video/${videoId}`;
    }
    
    // Para outras URLs, tentar como iframe direto
    return url;
}

// Carregar conteúdo externo
function loadExternalContent(externalId, url) {
    const externalBlock = document.getElementById(externalId);
    if (!externalBlock || !url.trim()) return;
    
    const externalContent = externalBlock.querySelector('.external-content');
    const urlInput = externalBlock.querySelector('.external-url-input');
    
    // Atualizar input se necessário
    if (urlInput.value !== url) {
        urlInput.value = url;
    }
    
    // Mostrar loading
    externalContent.innerHTML = `
        <div class="external-loading">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #9b9a97;"></i>
            <p>Carregando página externa...</p>
        </div>
    `;
    
    // Converter URL para formato embedável
    const embedUrl = convertToEmbedUrl(url);
    
    // Carregar iframe
    setTimeout(() => {
        externalContent.innerHTML = `
            <iframe src="${embedUrl}" frameborder="0" allowfullscreen 
                    style="width: 100%; height: 100%; border: none;"
                    onload="handleExternalLoad('${externalId}')"
                    onerror="handleExternalError('${externalId}')">
            </iframe>
        `;
        
        // Salvar conteúdo
        saveCurrentPageContent();
    }, 500);
}

// Manipular carregamento bem-sucedido
function handleExternalLoad(externalId) {
    console.log(`Página externa carregada: ${externalId}`);
}

// Manipular erro de carregamento
function handleExternalError(externalId) {
    const externalBlock = document.getElementById(externalId);
    if (!externalBlock) return;
    
    const externalContent = externalBlock.querySelector('.external-content');
    const url = externalBlock.querySelector('.external-url-input').value;
    
    externalContent.innerHTML = `
        <div class="external-error">
            <i class="fas fa-exclamation-triangle" style="font-size: 24px; color: #e74c3c; margin-bottom: 8px;"></i>
            <h4>Erro ao carregar página</h4>
            <p>Não foi possível carregar: <code>${url}</code></p>
            <div class="error-suggestions">
                <h5>Possíveis soluções:</h5>
                <ul>
                    <li>Verifique se a URL está correta</li>
                    <li>Certifique-se de que o conteúdo é público</li>
                    <li>Para Google Drive: compartilhe como "Qualquer pessoa com o link"</li>
                    <li>Alguns sites não permitem incorporação</li>
                </ul>
            </div>
            <button onclick="loadExternalContent('${externalId}', '${url}')" style="margin-top: 12px;">
                <i class="fas fa-retry"></i> Tentar novamente
            </button>
        </div>
    `;
}

// Mudar tipo de conteúdo externo
function changeExternalType(externalId, type) {
    const externalBlock = document.getElementById(externalId);
    if (!externalBlock) return;
    
    const urlInput = externalBlock.querySelector('.external-url-input');
    let url = urlInput.value.trim();
    
    if (!url) {
        // Mostrar exemplos baseados no tipo selecionado
        const examples = {
            'docs': 'https://docs.google.com/document/d/ID_DO_DOCUMENTO/edit',
            'sheets': 'https://docs.google.com/spreadsheets/d/ID_DA_PLANILHA/edit',
            'slides': 'https://docs.google.com/presentation/d/ID_DA_APRESENTACAO/edit',
            'drive': 'https://drive.google.com/file/d/ID_DO_ARQUIVO/view',
            'webpage': 'https://example.com',
            'auto': 'Cole qualquer URL aqui'
        };
        
        urlInput.placeholder = examples[type] || examples['auto'];
        return;
    }
    
    // Recarregar com o tipo específico se já houver URL
    loadExternalContent(externalId, url);
}

// Funções para código interpretável

// Alternar abas do live code
function switchLiveCodeTab(liveCodeId, tab) {
    const liveCodeBlock = document.getElementById(liveCodeId);
    if (!liveCodeBlock) return;
    
    // Atualizar abas
    const tabs = liveCodeBlock.querySelectorAll('.live-code-tab');
    const editors = liveCodeBlock.querySelectorAll('.live-code-editor');
    
    tabs.forEach(t => t.classList.remove('active'));
    editors.forEach(e => e.classList.remove('active'));
    
    const activeTab = liveCodeBlock.querySelector(`[data-tab="${tab}"]`);
    const activeEditor = liveCodeBlock.querySelector(`[data-lang="${tab}"]`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activeEditor) activeEditor.classList.add('active');
    
    // Focar no editor ativo
    setTimeout(() => {
        if (activeEditor) activeEditor.focus();
    }, 100);
}

// Executar código interpretável
function runLiveCode(liveCodeId) {
    const liveCodeBlock = document.getElementById(liveCodeId);
    if (!liveCodeBlock) return;
    
    const htmlEditor = liveCodeBlock.querySelector('[data-lang="html"]');
    const cssEditor = liveCodeBlock.querySelector('[data-lang="css"]');
    const jsEditor = liveCodeBlock.querySelector('[data-lang="js"]');
    const iframe = liveCodeBlock.querySelector('.live-code-frame');
    
    if (!iframe) return;
    
    const htmlCode = htmlEditor ? htmlEditor.value : '';
    const cssCode = cssEditor ? cssEditor.value : '';
    const jsCode = jsEditor ? jsEditor.value : '';
    
    // Criar documento completo
    const fullDocument = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Code Preview</title>
    <style>
        body {
            margin: 0;
            padding: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
        }
        ${cssCode}
    </style>
</head>
<body>
    ${htmlCode}
    <script>
        try {
            ${jsCode}
        } catch (error) {
            console.error('Erro no JavaScript:', error);
            document.body.innerHTML += '<div style="color: red; background: #ffe6e6; padding: 8px; margin: 8px 0; border-radius: 4px; font-family: monospace;"><strong>Erro JavaScript:</strong> ' + error.message + '</div>';
        }
    </script>
</body>
</html>`;
    
    // Atualizar iframe
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(fullDocument);
    doc.close();
    
    // Salvar conteúdo
    saveCurrentPageContent();
}

// Alternar execução automática
function toggleAutoRun(liveCodeId) {
    const liveCodeBlock = document.getElementById(liveCodeId);
    if (!liveCodeBlock) return;
    
    const autoButton = liveCodeBlock.querySelector('.live-code-auto-toggle');
    const isAuto = liveCodeBlock.hasAttribute('data-auto-run');
    
    if (isAuto) {
        liveCodeBlock.removeAttribute('data-auto-run');
        autoButton.classList.remove('active');
        autoButton.title = 'Ativar execução automática';
    } else {
        liveCodeBlock.setAttribute('data-auto-run', 'true');
        autoButton.classList.add('active');
        autoButton.title = 'Desativar execução automática';
        
        // Executar imediatamente
        runLiveCode(liveCodeId);
        
        // Configurar listeners para execução automática
        const editors = liveCodeBlock.querySelectorAll('.live-code-editor');
        editors.forEach(editor => {
            editor.addEventListener('input', () => {
                clearTimeout(editor.autoRunTimeout);
                editor.autoRunTimeout = setTimeout(() => {
                    runLiveCode(liveCodeId);
                }, 1000); // Delay de 1 segundo
            });
        });
    }
}

// Alternar tela cheia do preview
function togglePreviewFullscreen(liveCodeId) {
    const liveCodeBlock = document.getElementById(liveCodeId);
    if (!liveCodeBlock) return;
    
    const preview = liveCodeBlock.querySelector('.live-code-preview');
    const button = liveCodeBlock.querySelector('.live-code-preview-fullscreen');
    
    if (preview.classList.contains('fullscreen')) {
        preview.classList.remove('fullscreen');
        button.innerHTML = '<i class="fas fa-expand"></i>';
        button.title = 'Tela cheia';
    } else {
        preview.classList.add('fullscreen');
        button.innerHTML = '<i class="fas fa-compress"></i>';
        button.title = 'Sair da tela cheia';
    }
}

// Mudar tipo de live code
function changeLiveCodeType(liveCodeId, type) {
    const liveCodeBlock = document.getElementById(liveCodeId);
    if (!liveCodeBlock) return;
    
    const editorContainer = liveCodeBlock.querySelector('.live-code-editor-container');
    const tabs = liveCodeBlock.querySelector('.live-code-tabs');
    
    // Mostrar/ocultar abas baseado no tipo
    switch (type) {
        case 'html-only':
            tabs.style.display = 'none';
            switchLiveCodeTab(liveCodeId, 'html');
            break;
        case 'css-only':
            tabs.style.display = 'none';
            switchLiveCodeTab(liveCodeId, 'css');
            break;
        case 'js-only':
            tabs.style.display = 'none';
            switchLiveCodeTab(liveCodeId, 'js');
            break;
        default: // html (completo)
            tabs.style.display = 'flex';
            switchLiveCodeTab(liveCodeId, 'html');
            break;
    }
    
    // Re-executar se auto-run estiver ativo
    if (liveCodeBlock.hasAttribute('data-auto-run')) {
        runLiveCode(liveCodeId);
    }
}

// Auto-ajustar página externa para eliminar scroll
function autoFitExternalContent(externalId) {
    const externalBlock = document.getElementById(externalId);
    if (!externalBlock) return;
    
    const iframe = externalBlock.querySelector('iframe');
    if (!iframe) {
        alert('⚠️ Carregue uma página primeiro antes de usar o auto-ajuste');
        return;
    }
    
    // Mostrar feedback visual
    const autoFitBtn = externalBlock.querySelector('.external-autofit-btn');
    const originalHTML = autoFitBtn.innerHTML;
    autoFitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    autoFitBtn.disabled = true;
    
    try {
        // Método 1: Tentar acessar conteúdo do iframe (funciona para same-origin)
        let realHeight = null;
        
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc && iframeDoc.body) {
                // Calcular altura real do conteúdo
                const body = iframeDoc.body;
                const html = iframeDoc.documentElement;
                
                realHeight = Math.max(
                    body.scrollHeight,
                    body.offsetHeight,
                    html.clientHeight,
                    html.scrollHeight,
                    html.offsetHeight
                );
                
                // Adicionar margem de segurança
                realHeight += 50;
                
                console.log('✅ Altura real detectada:', realHeight + 'px');
            }
        } catch (crossOriginError) {
            console.log('ℹ️ Cross-origin iframe, usando método alternativo');
        }
        
        // Método 2: Se não conseguiu detectar, usar algoritmo iterativo
        if (!realHeight) {
            realHeight = detectHeightByIteration(iframe, autoFitBtn, originalHTML, externalId);
            return; // A função iterativa já cuida do resto
        }
        
        // Aplicar altura detectada
        applyAutoFitHeight(externalBlock, realHeight, autoFitBtn, originalHTML);
        
    } catch (error) {
        console.warn('Erro no auto-ajuste:', error);
        restoreAutoFitButton(autoFitBtn, originalHTML);
        
        // Aplicar altura padrão otimizada
        const defaultHeight = Math.max(600, window.innerHeight * 0.7);
        externalBlock.style.height = defaultHeight + 'px';
        saveCurrentPageContent();
    }
}

// Detectar altura por iteração (para cross-origin)
function detectHeightByIteration(iframe, autoFitBtn, originalHTML, externalId) {
    const externalBlock = document.getElementById(externalId);
    let currentTestHeight = 600; // Começar mais alto
    const maxHeight = window.innerHeight * 3; // Limite máximo mais alto
    let increment = 300; // Começar com incrementos maiores
    let iterations = 0;
    const maxIterations = 25; // Mais iterações
    let lastGoodHeight = currentTestHeight;
    
    console.log('🔍 Iniciando detecção iterativa de altura...');
    
    function testHeight() {
        iterations++;
        console.log(`📏 Testando altura: ${currentTestHeight}px (iteração ${iterations})`);
        
        // Aplicar altura de teste
        externalBlock.style.height = currentTestHeight + 'px';
        
        setTimeout(() => {
            // Estratégia mais agressiva baseada no tipo de conteúdo
            const url = externalBlock.querySelector('.external-url-input').value;
            let shouldContinue = true;
            let nextIncrement = increment;
            
            // Para Google services, ser muito mais agressivo
            if (url.includes('docs.google.com')) {
                if (currentTestHeight < 1800) { // Muito maior para docs
                    shouldContinue = true;
                    nextIncrement = currentTestHeight < 1000 ? 400 : 300;
                } else {
                    shouldContinue = false;
                }
            } else if (url.includes('sheets.google.com')) {
                if (currentTestHeight < 1600) { // Sheets podem ser enormes
                    shouldContinue = true;
                    nextIncrement = currentTestHeight < 800 ? 400 : 300;
                } else {
                    shouldContinue = false;
                }
            } else if (url.includes('slides.google.com')) {
                if (currentTestHeight < 1000) {
                    shouldContinue = true;
                    nextIncrement = 250;
                } else {
                    shouldContinue = false;
                }
            } else if (url.includes('drive.google.com')) {
                if (currentTestHeight < 1400) {
                    shouldContinue = true;
                    nextIncrement = 350;
                } else {
                    shouldContinue = false;
                }
            } else {
                // Para páginas web, ainda ser agressivo mas com limite menor
                if (currentTestHeight < Math.max(1200, window.innerHeight * 1.2)) {
                    shouldContinue = true;
                    nextIncrement = currentTestHeight < 800 ? 300 : 200;
                } else {
                    shouldContinue = false;
                }
            }
            
            // Verificar limites globais
            if (iterations >= maxIterations || currentTestHeight >= maxHeight) {
                shouldContinue = false;
            }
            
            if (!shouldContinue) {
                console.log(`✅ Finalizando com altura: ${currentTestHeight}px`);
                applyAutoFitHeight(externalBlock, currentTestHeight, autoFitBtn, originalHTML);
            } else {
                // Continuar testando com incremento ajustado
                lastGoodHeight = currentTestHeight;
                currentTestHeight += nextIncrement;
                increment = nextIncrement; // Atualizar incremento
                testHeight();
            }
        }, 200); // Mais tempo para o iframe se ajustar
    }
    
    testHeight();
}

// Aplicar altura final com animação
function applyAutoFitHeight(externalBlock, targetHeight, autoFitBtn, originalHTML) {
    const currentHeight = parseInt(externalBlock.style.height) || 400;
    
    // Garantir altura mínima, mas permitir alturas muito maiores para eliminar scroll
    targetHeight = Math.max(300, Math.min(targetHeight, window.innerHeight * 3));
    
    // Animar a mudança de altura
    animateHeight(externalBlock, currentHeight, targetHeight, 400, () => {
        // Restaurar botão após animação
        setTimeout(() => {
            restoreAutoFitButton(autoFitBtn, originalHTML);
            
            // Salvar alterações
            saveCurrentPageContent();
            
            // Feedback de sucesso
            autoFitBtn.style.background = '#10b981';
            setTimeout(() => {
                autoFitBtn.style.background = '';
            }, 1500);
            
            console.log('✅ Auto-ajuste concluído. Altura final:', targetHeight + 'px');
        }, 100);
    });
}

// Restaurar botão ao estado original
function restoreAutoFitButton(autoFitBtn, originalHTML) {
    autoFitBtn.innerHTML = originalHTML;
    autoFitBtn.disabled = false;
}


// Animar mudança de altura suavemente
function animateHeight(element, startHeight, endHeight, duration, callback) {
    const startTime = performance.now();
    const heightDiff = endHeight - startHeight;
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Usar easing suave (ease-out)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        const currentHeight = startHeight + (heightDiff * easeProgress);
        element.style.height = currentHeight + 'px';
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            element.style.height = endHeight + 'px';
            if (callback) callback();
        }
    }
    
    requestAnimationFrame(animate);
}

// Funções para gerenciar listas hierárquicas

// Adicionar novo item à lista
function addListItem(listId) {
    const listBlock = document.getElementById(listId);
    if (!listBlock) return;
    
    const listContent = listBlock.querySelector('.list-content');
    const listType = listBlock.getAttribute('data-list-type');
    
    // Encontrar o último item para determinar o índice
    const existingItems = listContent.querySelectorAll('.list-item');
    const lastItem = existingItems[existingItems.length - 1];
    const level = parseInt(lastItem.getAttribute('data-level')) || 0;
    const nextIndex = existingItems.length + 1;
    
    const newItem = document.createElement('div');
    newItem.className = 'list-item';
    newItem.setAttribute('data-level', level.toString());
    newItem.innerHTML = `
        <div class="list-marker ${listType}-marker" data-index="${nextIndex}"></div>
        <div class="list-item-content" contenteditable="true" placeholder="Digite o item da lista..."></div>
        <div class="list-controls">
            <button class="list-control-btn" onclick="addListItem('${listId}')" title="Adicionar item">
                <i class="fas fa-plus"></i>
            </button>
            <button class="list-control-btn" onclick="indentListItem(this)" title="Aumentar recuo">
                <i class="fas fa-indent"></i>
            </button>
            <button class="list-control-btn" onclick="outdentListItem(this)" title="Diminuir recuo">
                <i class="fas fa-outdent"></i>
            </button>
            <button class="list-control-btn" onclick="removeListItem(this)" title="Remover item">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    listContent.appendChild(newItem);
    updateListMarkers(listBlock);
    
    // Focar no novo item
    const newContent = newItem.querySelector('.list-item-content');
    newContent.focus();
    
    saveCurrentPageContent();
}

// Aumentar recuo do item (criar hierarquia)
function indentListItem(button) {
    const listItem = button.closest('.list-item');
    const currentLevel = parseInt(listItem.getAttribute('data-level')) || 0;
    const maxLevel = 5; // Máximo 6 níveis (0-5)
    
    if (currentLevel < maxLevel) {
        listItem.setAttribute('data-level', (currentLevel + 1).toString());
        const listBlock = button.closest('.list-block');
        updateListMarkers(listBlock);
        saveCurrentPageContent();
    }
}

// Diminuir recuo do item
function outdentListItem(button) {
    const listItem = button.closest('.list-item');
    const currentLevel = parseInt(listItem.getAttribute('data-level')) || 0;
    
    if (currentLevel > 0) {
        listItem.setAttribute('data-level', (currentLevel - 1).toString());
        const listBlock = button.closest('.list-block');
        updateListMarkers(listBlock);
        saveCurrentPageContent();
    }
}

// Remover item da lista
function removeListItem(button) {
    const listItem = button.closest('.list-item');
    const listBlock = button.closest('.list-block');
    const allItems = listBlock.querySelectorAll('.list-item');
    
    // Não permitir remover se for o último item
    if (allItems.length <= 1) {
        return;
    }
    
    listItem.remove();
    updateListMarkers(listBlock);
    saveCurrentPageContent();
}

// Atualizar marcadores da lista (números ou bullets)
function updateListMarkers(listBlock) {
    const listType = listBlock.getAttribute('data-list-type');
    const items = listBlock.querySelectorAll('.list-item');
    
    // Contar itens por nível para numeração correta
    const counters = {}; // { level: count }
    
    items.forEach((item, index) => {
        const level = parseInt(item.getAttribute('data-level')) || 0;
        const marker = item.querySelector('.list-marker');
        
        // Inicializar contador do nível se necessário
        if (counters[level] === undefined) {
            counters[level] = 0;
        }
        
        // Resetar contadores de níveis mais profundos quando subir de nível
        const prevItem = items[index - 1];
        if (prevItem) {
            const prevLevel = parseInt(prevItem.getAttribute('data-level')) || 0;
            if (level <= prevLevel) {
                Object.keys(counters).forEach(key => {
                    if (parseInt(key) > level) {
                        delete counters[key];
                    }
                });
            }
        }
        
        counters[level]++;
        
        // Definir conteúdo do marcador baseado no tipo e nível
        if (listType === 'ol') {
            // Lista numerada - diferentes estilos por nível
            const styles = ['decimal', 'lower-alpha', 'lower-roman', 'upper-alpha', 'upper-roman', 'decimal'];
            const style = styles[level % styles.length];
            
            let markerText;
            switch (style) {
                case 'lower-alpha':
                    markerText = String.fromCharCode(96 + counters[level]) + '.'; // a, b, c...
                    break;
                case 'lower-roman':
                    markerText = toRoman(counters[level]).toLowerCase() + '.';
                    break;
                case 'upper-alpha':
                    markerText = String.fromCharCode(64 + counters[level]) + '.'; // A, B, C...
                    break;
                case 'upper-roman':
                    markerText = toRoman(counters[level]) + '.';
                    break;
                default:
                    markerText = counters[level] + '.';
            }
            marker.textContent = markerText;
        } else {
            // Lista com marcadores - diferentes símbolos por nível
            const bullets = ['•', '◦', '▪', '▫', '‣', '⁃'];
            marker.textContent = bullets[level % bullets.length];
        }
        
        marker.setAttribute('data-index', counters[level]);
    });
}

// Converter número para romano
function toRoman(num) {
    const romanNumerals = [
        { value: 1000, symbol: 'M' },
        { value: 900, symbol: 'CM' },
        { value: 500, symbol: 'D' },
        { value: 400, symbol: 'CD' },
        { value: 100, symbol: 'C' },
        { value: 90, symbol: 'XC' },
        { value: 50, symbol: 'L' },
        { value: 40, symbol: 'XL' },
        { value: 10, symbol: 'X' },
        { value: 9, symbol: 'IX' },
        { value: 5, symbol: 'V' },
        { value: 4, symbol: 'IV' },
        { value: 1, symbol: 'I' }
    ];
    
    let result = '';
    for (let i = 0; i < romanNumerals.length; i++) {
        while (num >= romanNumerals[i].value) {
            result += romanNumerals[i].symbol;
            num -= romanNumerals[i].value;
        }
    }
    return result;
}

// Exportar bloco de lista hierárquica
function exportListBlock(blockData, alignment = 'left') {
    if (!blockData.listItems || blockData.listItems.length === 0) {
        // Fallback para formato antigo
        const content = blockData.content || '';
        const listType = blockData.type;
        if (listType === 'ul') {
            return `<div class="list-item align-${alignment}">• ${content}</div>`;
        } else {
            return `<div class="list-item numbered align-${alignment}">1. ${content}</div>`;
        }
    }
    
    const listType = blockData.type;
    let html = `<div class="exported-list-block ${listType}-list align-${alignment}">`;
    
    // Contar itens por nível para numeração
    const counters = {};
    
    blockData.listItems.forEach((item, index) => {
        const level = parseInt(item.level) || 0;
        const content = item.content || '';
        
        // Inicializar contador do nível
        if (counters[level] === undefined) {
            counters[level] = 0;
        }
        
        // Resetar contadores de níveis mais profundos quando subir
        const prevItem = blockData.listItems[index - 1];
        if (prevItem) {
            const prevLevel = parseInt(prevItem.level) || 0;
            if (level <= prevLevel) {
                Object.keys(counters).forEach(key => {
                    if (parseInt(key) > level) {
                        delete counters[key];
                    }
                });
            }
        }
        
        counters[level]++;
        
        // Gerar marcador
        let marker;
        if (listType === 'ol') {
            const styles = ['decimal', 'lower-alpha', 'lower-roman', 'upper-alpha', 'upper-roman', 'decimal'];
            const style = styles[level % styles.length];
            
            switch (style) {
                case 'lower-alpha':
                    marker = String.fromCharCode(96 + counters[level]) + '.';
                    break;
                case 'lower-roman':
                    marker = toRoman(counters[level]).toLowerCase() + '.';
                    break;
                case 'upper-alpha':
                    marker = String.fromCharCode(64 + counters[level]) + '.';
                    break;
                case 'upper-roman':
                    marker = toRoman(counters[level]) + '.';
                    break;
                default:
                    marker = counters[level] + '.';
            }
        } else {
            const bullets = ['•', '◦', '▪', '▫', '‣', '⁃'];
            marker = bullets[level % bullets.length];
        }
        
        html += `
            <div class="exported-list-item" data-level="${level}">
                <span class="exported-list-marker ${listType}-marker">${marker}</span>
                <span class="exported-list-content">${content}</span>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// Converter HTML em blocos editáveis
function convertHTMLToBlocks(contentArea) {
    const blocks = [];
    const elements = Array.from(contentArea.children);
    
    elements.forEach(element => {
        const blockData = parseElementToBlock(element);
        if (blockData) {
            blocks.push(blockData);
        }
    });
    return blocks;
}

// Converter elemento HTML específico em dados de bloco
function parseElementToBlock(element) {
    const tagName = element.tagName.toLowerCase();
    const textContent = element.textContent.trim();
    const innerHTML = element.innerHTML.trim();
    
    
    // Primeiro verificar se é um bloco exportado com data-block-type
    if (element.hasAttribute('data-block-type')) {
        const blockType = element.getAttribute('data-block-type');
        
        
        // Para blocos de lista exportados
        if (blockType === 'ul' || blockType === 'ol') {
            const exportedListDiv = element.querySelector('.exported-list-block');
            if (exportedListDiv) {
                return parseExportedListToBlock(exportedListDiv);
            }
        }
        
        // Para outros tipos de bloco exportados, usar o conteúdo interno
        const blockContent = element.querySelector('.block-content');
        if (blockContent) {
            return {
                type: blockType,
                content: blockContent.innerHTML,
                extraData: {}
            };
        }
    }
    
    switch (tagName) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
            return {
                type: tagName,
                content: textContent,
                extraData: {}
            };
            
        case 'p':
            // Verificar se é um bloco vazio
            if (!textContent && !innerHTML) {
                return null;
            }
            return {
                type: 'p',
                content: innerHTML,
                extraData: {}
            };
            
        case 'ul':
        case 'ol':
            return parseListToBlock(element, tagName);
            
        case 'pre':
            const codeElement = element.querySelector('code');
            const codeContent = codeElement ? codeElement.textContent : element.textContent;
            const language = extractLanguageFromCode(codeElement);
            
            return {
                type: 'code',
                content: codeContent,
                extraData: {
                    language: language
                }
            };
            
        case 'img':
            const src = element.getAttribute('src');
            const alt = element.getAttribute('alt');
            
            return {
                type: 'image',
                content: src,
                extraData: {
                    mediaType: 'image',
                    alt: alt || ''
                }
            };
            
        case 'video':
            const videoSrc = element.getAttribute('src') || 
                           (element.querySelector('source') && element.querySelector('source').getAttribute('src'));
            
            return {
                type: 'video',
                content: videoSrc,
                extraData: {
                    mediaType: 'video'
                }
            };
            
        case 'iframe':
            const iframeSrc = element.getAttribute('src');
            
            // Verificar se é um PDF
            if (iframeSrc && (iframeSrc.includes('.pdf') || element.getAttribute('type') === 'application/pdf')) {
                return {
                    type: 'pdf',
                    content: iframeSrc,
                    extraData: {
                        mediaType: 'pdf'
                    }
                };
            }
            
            // Página externa
            return {
                type: 'external',
                content: iframeSrc,
                extraData: {
                    mediaType: 'external',
                    width: element.style.width || element.getAttribute('width') || '100%',
                    height: element.style.height || element.getAttribute('height') || '400px'
                }
            };
            
        case 'a':
            const href = element.getAttribute('href');
            const linkText = textContent;
            
            return {
                type: 'link',
                content: href,
                extraData: {
                    title: linkText,
                    url: href
                }
            };
            
        case 'div':
            // Tentar identificar tipos especiais de div
            const className = element.className;
            
            // Lista exportada (hierárquica) - PRIORIDADE ALTA
            if (className.includes('exported-list-block')) {
                return parseExportedListToBlock(element);
            }
            
            // Toggle block
            if (className.includes('toggle') || element.querySelector('.toggle-header')) {
                const headerElement = element.querySelector('.toggle-header') || 
                                    element.querySelector('summary') ||
                                    element.querySelector('.toggle-title');
                const contentElement = element.querySelector('.toggle-content') || 
                                     element.querySelector('.toggle-body');
                
                const headerText = headerElement ? headerElement.textContent.trim() : 'Toggle';
                const contentText = contentElement ? contentElement.innerHTML : '';
                
                return {
                    type: 'toggle',
                    content: headerText,
                    extraData: {
                        content: contentText,
                        isOpen: !element.classList.contains('collapsed')
                    }
                };
            }
            
            // Live code block
            if (className.includes('live-code')) {
                const htmlCode = extractLiveCodeHTML(element);
                const cssCode = extractLiveCodeCSS(element);
                const jsCode = extractLiveCodeJS(element);
                
                return {
                    type: 'live-code',
                    content: '',
                    extraData: {
                        mediaType: 'live-code',
                        htmlCode: htmlCode,
                        cssCode: cssCode,
                        jsCode: jsCode
                    }
                };
            }
            
            // Index block
            if (className.includes('index-block')) {
                return {
                    type: 'index',
                    content: '',
                    extraData: {}
                };
            }
            
            // TOC block
            if (className.includes('toc-block')) {
                return {
                    type: 'toc',
                    content: '',
                    extraData: {}
                };
            }
            
            // Bloco genérico com conteúdo
            if (textContent || innerHTML) {
                return {
                    type: 'p',
                    content: innerHTML,
                    extraData: {}
                };
            }
            
            return null;
            
        case 'details':
            const summary = element.querySelector('summary');
            const headerText = summary ? summary.textContent.trim() : 'Toggle';
            const isOpen = element.hasAttribute('open');
            
            // Remover summary do conteúdo
            const contentClone = element.cloneNode(true);
            const summaryClone = contentClone.querySelector('summary');
            if (summaryClone) {
                summaryClone.remove();
            }
            
            return {
                type: 'toggle',
                content: headerText,
                extraData: {
                    content: contentClone.innerHTML,
                    isOpen: isOpen
                }
            };
            
        default:
            // Para elementos não reconhecidos, tentar extrair conteúdo útil
            if (textContent) {
                return {
                    type: 'p',
                    content: innerHTML,
                    extraData: {}
                };
            }
            return null;
    }
}

// Converter lista HTML em bloco de lista
function parseListToBlock(listElement, listType) {
    const listItems = [];
    
    function parseListItems(items, level = 0) {
        Array.from(items).forEach(item => {
            if (item.tagName.toLowerCase() === 'li') {
                const itemContent = getDirectTextContent(item);
                
                if (itemContent.trim()) {
                    listItems.push({
                        content: itemContent,
                        level: level
                    });
                }
                
                // Procurar sublistas
                const subLists = item.querySelectorAll(':scope > ul, :scope > ol');
                subLists.forEach(subList => {
                    parseListItems(subList.children, level + 1);
                });
            }
        });
    }
    
    parseListItems(listElement.children);
    
    return {
        type: listType,
        content: '',
        extraData: {
            listItems: listItems
        }
    };
}

// Converter lista exportada de volta em bloco editável
function parseExportedListToBlock(listElement) {
    const listItems = [];
    const isNumbered = listElement.classList.contains('ol-list');
    const items = listElement.querySelectorAll('.exported-list-item');
    
    items.forEach(item => {
        const level = parseInt(item.getAttribute('data-level')) || 0;
        const contentElement = item.querySelector('.exported-list-content');
        const content = contentElement ? contentElement.textContent.trim() : '';
        
        if (content) {
            listItems.push({
                content: content,
                level: level
            });
        }
    });
    
    return {
        type: isNumbered ? 'ol' : 'ul',
        content: '',
        extraData: {
            listItems: listItems
        }
    };
}

// Obter apenas o texto direto do elemento (sem texto de elementos filhos)
function getDirectTextContent(element) {
    let text = '';
    
    for (let node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            // Incluir apenas elementos inline
            if (['strong', 'b', 'em', 'i', 'u', 'span', 'a', 'code'].includes(tagName)) {
                text += node.outerHTML;
            }
            // Parar ao encontrar listas aninhadas
            else if (['ul', 'ol'].includes(tagName)) {
                break;
            }
        }
    }
    
    return text.trim();
}

// Extrair linguagem do código
function extractLanguageFromCode(codeElement) {
    if (!codeElement) return 'javascript';
    
    const className = codeElement.className;
    const langMatch = className.match(/language-(\w+)/);
    
    if (langMatch) {
        return langMatch[1];
    }
    
    // Tentar detectar pela classe do Prism
    const prismMatch = className.match(/lang-(\w+)/);
    if (prismMatch) {
        return prismMatch[1];
    }
    
    return 'javascript';
}

// Extrair código HTML de live-code
function extractLiveCodeHTML(element) {
    const htmlContent = element.querySelector('.live-code-content');
    if (htmlContent) {
        return htmlContent.innerHTML;
    }
    
    // Tentar extrair de script inline
    const scripts = element.querySelectorAll('script');
    for (let script of scripts) {
        if (script.innerHTML.includes('document.body.innerHTML') || 
            script.innerHTML.includes('innerHTML')) {
            // Extrair HTML de strings no JavaScript
            const htmlMatch = script.innerHTML.match(/innerHTML\s*=\s*['"`]([^'"`]*)['"`]/);
            if (htmlMatch) {
                return htmlMatch[1];
            }
        }
    }
    
    return '';
}

// Extrair código CSS de live-code
function extractLiveCodeCSS(element) {
    const styleElement = element.querySelector('style');
    if (styleElement) {
        let css = styleElement.innerHTML;
        
        // Remover regras específicas do container
        const uniqueId = element.id;
        if (uniqueId) {
            css = css.replace(new RegExp(`#${uniqueId}\\s+\\.live-code-content\\s*\\{([^}]*)\\}`, 'g'), '$1');
            css = css.replace(new RegExp(`#${uniqueId}[^{]*\\{[^}]*\\}`, 'g'), '');
        }
        
        return css.trim();
    }
    
    return '';
}

// Extrair código JavaScript de live-code
function extractLiveCodeJS(element) {
    const scripts = element.querySelectorAll('script');
    
    for (let script of scripts) {
        const scriptContent = script.innerHTML;
        
        // Extrair código do IIFE
        const iifeMatch = scriptContent.match(/\(function\(\)\s*\{[\s\S]*try\s*\{([\s\S]*?)\}\s*catch/);
        if (iifeMatch) {
            return iifeMatch[1].trim();
        }
        
        // Código direto
        if (!scriptContent.includes('convertHTMLToBlocks') && 
            !scriptContent.includes('error.message')) {
            return scriptContent.trim();
        }
    }
    
    return '';
}

// Parsear página individual do HTML
function parsePageFromHTML(htmlContent, filename) {
    try {
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // Extrair título da página
        const titleElement = tempDiv.querySelector('.page-title') || tempDiv.querySelector('title');
        const title = titleElement ? titleElement.textContent.trim() : filename.replace('.html', '');
        
        // Extrair emoji
        const emojiElement = tempDiv.querySelector('.page-emoji');
        const emoji = emojiElement ? emojiElement.textContent.trim() : '📄';
        
        // Encontrar área de conteúdo
        const contentArea = tempDiv.querySelector('.page-content') || 
                          tempDiv.querySelector('.editor-content') || 
                          tempDiv.querySelector('.main-content') ||
                          tempDiv.querySelector('body') ||
                          tempDiv;
        
        
        if (contentArea) {
            // Converter HTML em blocos editáveis
            const convertedBlocks = convertHTMLToBlocks(contentArea);
            
            const pageId = 'imported-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            
            const pageData = {
                id: pageId,
                title: title,
                content: convertedBlocks,
                parentId: null,
                children: [],
                emoji: emoji,
                filename: filename
            };
            
            return pageData;
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao parsear página:', filename, error);
        return null;
    }
}

// Reconstruir hierarquia de páginas baseada nos nomes dos arquivos
function reconstructPageHierarchy(importedPages) {
    const pagesByFilename = {};
    const rootPages = [];
    
    // Mapear por filename
    Object.values(importedPages).forEach(page => {
        pagesByFilename[page.filename] = page;
    });
    
    // Detectar hierarquia baseada nos nomes dos arquivos
    Object.values(importedPages).forEach(page => {
        const filename = page.filename;
        
        // Verificar se é subpágina (contém underscore ou hífen)
        if (filename.includes('_') || filename.includes('-')) {
            // Tentar encontrar página pai
            const possibleParentNames = [
                filename.split('_')[0] + '.html',
                filename.split('-')[0] + '.html',
                filename.replace(/_.*$/, '.html'),
                filename.replace(/-.*$/, '.html')
            ];
            
            let parentFound = false;
            for (const parentName of possibleParentNames) {
                if (pagesByFilename[parentName] && parentName !== filename) {
                    const parentPage = pagesByFilename[parentName];
                    page.parentId = parentPage.id;
                    if (!parentPage.children.includes(page.id)) {
                        parentPage.children.push(page.id);
                    }
                    parentFound = true;
                    break;
                }
            }
            
            if (!parentFound) {
                rootPages.push(page);
            }
        } else {
            rootPages.push(page);
        }
    });
    
    return rootPages;
}

