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

    // 5. Form Submission (Prevent Default para demonstração)
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const btn = contactForm.querySelector('button');
            const originalText = btn.innerText;

            btn.innerText = 'Enviando...';
            btn.disabled = true;

            // Simulação de envio
            setTimeout(() => {
                alert('Mensagem enviada com sucesso! Entraremos em contato em breve.');
                contactForm.reset();
                btn.innerText = originalText;
                btn.disabled = false;
            }, 1500);
        });
    }
});

// Carrega posts do blog a partir de posts.json
let allPosts = []; // Armazena todos os posts para pesquisa
let postsContent = {}; // Cache do conteúdo completo dos posts

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

function renderPosts(posts) {
    const list = document.getElementById("posts");
    const empty = document.getElementById("no-posts");

    // Limpa posts existentes
    list.innerHTML = "";

    if (!Array.isArray(posts) || posts.length === 0) {
        empty.hidden = false;
        return;
    }

    empty.hidden = true;

    // Ordena por data desc
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    posts.forEach(p => {
        const card = document.createElement("article");
        card.className = "post-card";
        const date = new Date(p.date);
        const dateStr = date.toLocaleDateString("pt-BR", { year: "numeric", month: "short", day: "2-digit" });

        // Extrai o slug da URL para criar o link de navegação
        const slug = new URLSearchParams(p.url.split('?')[1]).get('slug');
        const navigationUrl = slug ? `post.html?slug=${slug}` : p.url;

        card.innerHTML = `
      <div class="post-meta">🗓️ <span>${dateStr}</span></div>
      <h3><a href="${navigationUrl}" rel="noopener">${p.title}</a></h3>
      <p>${p.excerpt || ""}</p>
    `;
        list.appendChild(card);
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

    // Adiciona indicador de carregamento
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.placeholder = "Carregando conteúdo para pesquisa...";
    }
});
