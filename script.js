document.addEventListener('DOMContentLoaded', () => {

    // 1. Mobile Menu Toggle
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Fechar menu mobile ao clicar em um link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // 2. Header Style on Scroll
    const header = document.getElementById('header');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 3. Highlight Active Nav Link on Scroll
    const sections = document.querySelectorAll('section');

    window.addEventListener('scroll', () => {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;

            // Verifica em qual seção estamos considerando um pequeno offset do header
            if (scrollY >= (sectionTop - 150)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });
    });

    // 4. Scroll Animations (Intersection Observer)
    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

    const revealOptions = {
        threshold: 0.15, // Aciona quando 15% do elemento for visível
        rootMargin: "0px 0px -50px 0px"
    };

    const revealOnScroll = new IntersectionObserver(function (entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    revealElements.forEach(el => {
        revealOnScroll.observe(el);
    });

    // 5. Form Submission (Corrigido: Captura de IDs reais e tratamento de eventos)
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault(); // Impede o recarregamento da página

            const btn = contactForm.querySelector('button');
            const originalText = btn.innerText;

            // Feedback visual e trava anti-duplo clique
            btn.innerText = 'Enviando...';
            btn.disabled = true;

            // Captura usando os IDs reais presentes no seu HTML
            const nome = document.getElementById('nome').value.trim();
            const telefone = document.getElementById('telefone').value.trim(); // ID Corrigido!
            const mensagem = document.getElementById('mensagem').value.trim();
            let interesse = document.getElementById('interesse').value.trim();

            if (!nome || !telefone || !mensagem || !interesse) {
                alert('Por favor, preencha todos os campos do formulário.');
                btn.innerText = originalText;
                btn.disabled = false;
                return;
            }

            // Tratamento do texto do select
            if (interesse === "avaliacao") {
                interesse = "Avaliação Médica";
            } else if (interesse === "eeg") {
                interesse = "Exame de EEG";
            } else if (interesse === "ortomolecular") {
                interesse = "Avaliação Ortomolecular";
            } else if (interesse === "bioimpedancia") { // Corrigido erro de digitação do HTML
                interesse = "Bioimpedância";
            } else if (interesse === "soroterapia") {
                interesse = "Soroterapia";
            } else if (interesse === "outro") {
                alert('Por favor, especifique seu interesse no campo "Mensagem".');
                btn.innerText = originalText;
                btn.disabled = false;
                return;
            }

            // Montagem do texto e link para a API do WhatsApp
            const whatsappMessage = `Olá, meu nome é ${nome}.\n*Contato:* ${telefone}\n*Interesse:* ${interesse}\n*Mensagem:* ${mensagem}`;
            const whastappURL = `https://wa.me/5519996465072?text=${encodeURIComponent(whatsappMessage)}`;

            // Abre a API do WhatsApp em nova aba
            window.open(whastappURL, '_blank');

            // Timeout de segurança: limpa o formulário e libera o botão depois de abrir a aba
            setTimeout(() => {
                contactForm.reset();
                btn.innerText = originalText;
                btn.disabled = false;
            }, 600);
        });
    }


    // Carrega posts do blog a partir de posts.json
    let allPosts = []; // Armazena todos os posts para pesquisa
    let postsContent = {}; // Cache do conteúdo completo dos posts

    const POSTS_PER_PAGE = 4; // Quantos posts aparecem por vez na Home
    let currentPosts = []; // Lista atualmente filtrada (pesquisa aplicada ou não)
    let visibleCount = POSTS_PER_PAGE; // Quantos posts da lista atual estão visíveis

    async function loadPosts() {
        try {
            const res = await fetch("data/posts.json", { cache: "no-store" });
            if (!res.ok) throw new Error("Falha ao carregar posts.json");
            const posts = await res.json();
            allPosts = posts; // Armazena posts para pesquisa

            // Carrega conteúdo completo dos posts em background
            loadPostsContent(posts);

            renderPosts(posts);
        } catch (e) {
            console.warn(e);
            const empty = document.getElementById("no-posts");
            if (empty) empty.hidden = false;
        }
    }

    // Carrega o conteúdo completo de cada post
    async function loadPostsContent(posts) {
        // Carrega posts em paralelo para melhor performance
        const promises = posts.map(async (post) => {
            try {
                const slug = new URLSearchParams(post.url.split('?')[1]).get('slug');
                const postUrl = slug ? `posts/${slug}.html` : post.url;

                const response = await fetch(postUrl, { cache: "no-store" });
                if (response.ok) {
                    const html = await response.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');

                    // Tenta diferentes seletores para encontrar o conteúdo principal
                    const contentSelectors = [
                        '.post-content',
                        '.content',
                        'main article',
                        'article',
                        'main',
                        '.post-body',
                        '.entry-content'
                    ];

                    let contentElement = null;
                    for (const selector of contentSelectors) {
                        contentElement = doc.querySelector(selector);
                        if (contentElement) break;
                    }

                    // Se não encontrou, usa o body mas remove header, nav, footer
                    if (!contentElement) {
                        contentElement = doc.body;
                        if (contentElement) {
                            // Remove elementos que não são conteúdo principal
                            const elementsToRemove = contentElement.querySelectorAll('header, nav, footer, .header, .nav, .footer, script, style');
                            elementsToRemove.forEach(el => el.remove());
                        }
                    }

                    const textContent = contentElement ? contentElement.textContent || contentElement.innerText : '';

                    // Remove espaços extras, quebras de linha e caracteres especiais
                    const cleanContent = textContent
                        .replace(/\s+/g, ' ')
                        .replace(/[^\w\sáàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]/gi, ' ')
                        .trim();

                    postsContent[post.url] = cleanContent;

                    // Atualiza o placeholder da pesquisa para indicar que o conteúdo foi carregado
                    updateSearchPlaceholder();
                }
            } catch (e) {
                console.warn(`Erro ao carregar conteúdo do post ${post.url}:`, e);
                postsContent[post.url] = post.excerpt || '';
            }
        });

        await Promise.all(promises);
    }

    // Atualiza o placeholder da pesquisa
    function updateSearchPlaceholder() {
        const searchInput = document.getElementById("searchInput");
        if (searchInput && Object.keys(postsContent).length === allPosts.length) {
            searchInput.placeholder = "Pesquisar por título, conteúdo ou palavras-chave...";
        }
    }

    // Define o conjunto de posts a exibir (todos ou filtrados pela pesquisa)
    // e reinicia a paginação para a primeira leva.
    function renderPosts(posts) {
        const empty = document.getElementById("no-posts");
        const loadMoreBtn = document.getElementById("loadMoreBtn");
        const list = document.getElementById("posts");

        if (!Array.isArray(posts)) posts = [];

        // Ordena por data desc
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        currentPosts = posts;
        visibleCount = POSTS_PER_PAGE;

        if (posts.length === 0) {
            if (list) list.innerHTML = "";
            if (empty) empty.hidden = false;
            if (loadMoreBtn) loadMoreBtn.hidden = true;
            return;
        }

        if (empty) empty.hidden = true;
        renderVisiblePosts();
    }

    // Desenha apenas a "página" atual (currentPosts.slice(0, visibleCount))
    // e mostra/esconde o botão "Carregar mais" conforme o restante.
    function renderVisiblePosts() {
        const list = document.getElementById("posts");
        const loadMoreBtn = document.getElementById("loadMoreBtn");

        if (!list) return;

        list.innerHTML = "";

        const visiblePosts = currentPosts.slice(0, visibleCount);

        visiblePosts.forEach((p, index) => {
            // O post mais recente ganha um destaque em largura total (só faz sentido com mais de 1 post)
            const isFeatured = index === 0 && currentPosts.length > 1;

            const card = document.createElement("a");
            card.className = isFeatured ? "post-card post-card-featured" : "post-card";
            const date = new Date(p.date);
            const dateStr = date.toLocaleDateString("pt-BR", { year: "numeric", month: "short", day: "2-digit" });

            // Extrai o slug da URL para criar o link de navegação
            const slug = new URLSearchParams(p.url.split('?')[1]).get('slug');
            const navigationUrl = slug ? `post.html?slug=${slug}` : p.url;

            card.href = navigationUrl;
            card.rel = "noopener";

            card.innerHTML = `
    <div class="post-card-top">
        <span class="post-date"><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
        ${isFeatured ? '<span class="post-badge">Mais recente</span>' : ''}
    </div>
    <h3>${p.title}</h3>
    <p>${p.excerpt || ""}</p>
    <span class="post-read-more">Ler artigo <i class="fa-solid fa-arrow-right"></i></span>
    `;
            list.appendChild(card);
        });

        if (loadMoreBtn) {
            const hasMore = visibleCount < currentPosts.length;
            const canCollapse = currentPosts.length > POSTS_PER_PAGE;

            if (!hasMore && !canCollapse) {
                // Cabem todos os posts na primeira leva: não há o que paginar
                loadMoreBtn.hidden = true;
            } else {
                loadMoreBtn.hidden = false;
                loadMoreBtn.innerHTML = hasMore
                    ? 'Carregar mais artigos <i class="fa-solid fa-chevron-down"></i>'
                    : 'Mostrar menos <i class="fa-solid fa-chevron-up"></i>';
            }
        }
    }

    // Inicializa o botão "Carregar mais / Mostrar menos"
    function initLoadMore() {
        const loadMoreBtn = document.getElementById("loadMoreBtn");
        if (!loadMoreBtn) return;

        loadMoreBtn.addEventListener("click", () => {
            const isCollapsing = visibleCount >= currentPosts.length;

            if (isCollapsing) {
                visibleCount = POSTS_PER_PAGE;
            } else {
                visibleCount += POSTS_PER_PAGE;
            }

            renderVisiblePosts();

            // Ao recolher, volta o scroll para o topo da seção de blog
            // para não deixar o usuário "perdido" abaixo dos cards que sumiram
            if (isCollapsing) {
                const blogSection = document.getElementById("blog");
                if (blogSection) {
                    blogSection.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }
        });
    }

    // Inicializa a pesquisa
    function initSearch() {
        const searchInput = document.getElementById("searchInput");
        const clearBtn = document.getElementById("clearSearch");

        if (!searchInput || !clearBtn) return;

        // Função de pesquisa
        function searchPosts(query) {
            if (!query.trim()) {
                renderPosts(allPosts);
                clearBtn.classList.remove("visible");
                return;
            }

            clearBtn.classList.add("visible");

            const filteredPosts = allPosts.filter(post => {
                // Busca no título e excerpt primeiro
                const titleExcerpt = `${post.title} ${post.excerpt || ""}`.toLowerCase();

                // Se encontrou no título/excerpt, retorna true
                if (titleExcerpt.includes(query.toLowerCase())) {
                    return true;
                }

                // Busca no conteúdo completo se disponível
                const fullContent = postsContent[post.url];
                if (fullContent) {
                    return fullContent.toLowerCase().includes(query.toLowerCase());
                }

                return false;
            });

            renderPosts(filteredPosts);
        }

        // Event listeners
        searchInput.addEventListener("input", (e) => {
            searchPosts(e.target.value);
        });

        clearBtn.addEventListener("click", () => {
            searchInput.value = "";
            searchInput.focus();
            searchPosts("");
        });

        // Limpa pesquisa ao pressionar Escape
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                searchInput.value = "";
                searchPosts("");
            }
        });
    }

    // Carrega posts e inicializa pesquisa
    loadPosts().then(() => {
        initSearch();
        initLoadMore();

        // Adiciona indicador de carregamento
        const searchInput = document.getElementById("searchInput");
        if (searchInput) {
            searchInput.placeholder = "Carregando conteúdo para pesquisa...";
        }
    });
});