const SUPABASE_URL = 'https://supabase.co'; 
let supabase = null;
let editingMangaId = null; 
let currentMangaCover = ''; 

const modal = document.getElementById('modalOverlay');
const openBtn = document.getElementById('openFormBtn');
const closeBtn = document.getElementById('closeFormBtn');
const form = document.getElementById('addMangaForm');
const mangaGrid = document.getElementById('mangaGrid');
const submitBtn = document.getElementById('submitBtn');
const deleteBtn = document.getElementById('deleteMangaBtn');
const modalTitle = document.getElementById('modalTitle');

function checkAuth() {
    let savedKey = localStorage.getItem('supabase_secret_key');
    while (!savedKey) {
        savedKey = prompt('Для доступа к библиотеке введите ваш Service Role Key из Supabase:');
        if (savedKey === null) {
            document.body.innerHTML = '<h1 style="text-align:center; margin-top:100px; color:#ff4757;">Доступ заблокирован.</h1>';
            return false;
        }
        if (savedKey.trim() === '') { savedKey = null; }
    }
    localStorage.setItem('supabase_secret_key', savedKey);
    supabase = supabase.createClient(SUPABASE_URL, savedKey);
    return true;
}

if (openBtn) {
    openBtn.addEventListener('click', () => {
        editingMangaId = null; currentMangaCover = '';
        modalTitle.innerText = 'Новый тайтл'; submitBtn.innerText = 'Добавить';
        deleteBtn.style.display = 'none'; form.reset();
        document.getElementById('currentChapter').value = 1;
        modal.style.display = 'flex';
    });
}
if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

async function updateChapter(id, newChapter) {
    if (newChapter < 1) return;
    const { error } = await supabase.from('manga').update({ current: newChapter }).eq('id', id);
    if (error) { alert('Ошибка: ' + error.message); } else { loadMangaFromCloud(); }
}

function openEditModal(manga) {
    editingMangaId = manga.id; currentMangaCover = manga.cover;
    modalTitle.innerText = 'Редактировать тайтл'; submitBtn.innerText = 'Сохранить';
    deleteBtn.style.display = 'block';
    document.getElementById('title').value = manga.title;
    document.getElementById('currentChapter').value = manga.current;
    document.getElementById('totalChapters').value = manga.total || '';
    modal.style.display = 'flex';
}
javascriptif (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
        if (!editingMangaId || !confirm('Удалить этот тайтл?')) return;
        const { error } = await supabase.from('manga').delete().eq('id', editingMangaId);
        if (error) { alert('Ошибка: ' + error.message); } else { modal.style.display = 'none'; loadMangaFromCloud(); }
    });
}

function renderMangaCard(manga) {
    const card = document.createElement('div');
    card.className = 'tile manga-card';
    const coverUrl = manga.cover ? manga.cover : 'https://unsplash.com';
    
    card.innerHTML = `
        <div class="manga-cover" style="background-image: url('${coverUrl}');"></div>
        <div class="manga-info">
            <h3 class="manga-title">${manga.title}</h3>
            <div class="manga-controls">
                <button class="chapter-btn minus-btn">—</button>
                <div class="manga-chapters">Гл. ${manga.current}${manga.total ? ' / ' + manga.total : ''}</div>
                <button class="chapter-btn plus-btn">+</button>
            </div>
        </div>
    `;
    card.querySelector('.manga-cover').addEventListener('click', () => openEditModal(manga));
    card.querySelector('.manga-title').addEventListener('click', () => openEditModal(manga));
    card.querySelector('.minus-btn').addEventListener('click', (e) => { e.stopPropagation(); updateChapter(manga.id, manga.current - 1); });
    card.querySelector('.plus-btn').addEventListener('click', (e) => { e.stopPropagation(); updateChapter(manga.id, manga.current + 1); });
    mangaGrid.appendChild(card);
}

async function loadMangaFromCloud() {
    if (!supabase) return;
    mangaGrid.innerHTML = ''; mangaGrid.appendChild(openBtn);
    const { data, error } = await supabase.from('manga').select('*').order('id', { ascending: true });
    if (error) { localStorage.removeItem('supabase_secret_key'); alert('Ошибка базы!'); return; }
    data.forEach(manga => renderMangaCard(manga));
}

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); if (!supabase) return;
        submitBtn.disabled = true; submitBtn.innerText = 'Загрузка...';
        const fileInput = document.getElementById('coverFile');
        const file = (fileInput && fileInput.files && fileInput.files.length > 0) ? fileInput.files[0] : null;
        let coverUrl = currentMangaCover; 

        if (file) {
            const fileExt = file.name.split('.').pop();
            const filePath = `${Date.now()}.${fileExt}`;
            const { error: upErr } = await supabase.storage.from('covers').upload(filePath, file);
            if (upErr) { alert('Ошибка картинки: ' + upErr.message); submitBtn.disabled = false; submitBtn.innerText = 'Ок'; return; }
            const { data: urlData } = supabase.storage.from('covers').getPublicUrl(filePath);
            coverUrl = urlData.publicUrl;
        }

        const mangaData = {
            title: document.getElementById('title').value, cover: coverUrl || null,
            current: parseInt(document.getElementById('currentChapter').value) || 1,
            total: document.getElementById('totalChapters').value ? parseInt(document.getElementById('totalChapters').value) : null
        };
        let err = null;
        if (editingMangaId) {
            const { error: uErr } = await supabase.from('manga').update(mangaData).eq('id', editingMangaId); err = uErr;
        } else {
            const { error: iErr } = await supabase.from('manga').insert([mangaData]); err = iErr;
        }
        if (err) { alert('Ошибка базы: ' + err.message); } else { await loadMangaFromCloud(); form.reset(); modal.style.display = 'none'; }
        submitBtn.disabled = false; submitBtn.innerText = 'Добавить';
    });
}

if (checkAuth()) { loadMangaFromCloud(); }
