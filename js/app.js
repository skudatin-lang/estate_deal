/*
APP V5 - FIXED SYNTAX & FORCE CLEANUP
*/
let deal;
let isRefreshing = false;

document.addEventListener("DOMContentLoaded", startApp);

function startApp() {
    loadDeal();
    
    // Если объектов нет, создаем первый
    if (!deal.objects || !deal.objects.length) {
        deal.objects = [DealModel.createObject()];
    }

    DealRenderer.init("#diagram");
    DealUI.init("#editor", deal);
    createToolbar();
    
    // Принудительно пересчитываем всё при старте
    refreshAll();
}

function refreshAll() {
    if (isRefreshing) return;
    isRefreshing = true;
    try {
        // 1. Сначала чистим и синхронизируем покупателей
        FlowEngine.ensureBuyerLink(deal);
        // 2. Считаем математику
        DealCalculator.rebuild(deal);
        // 3. Рисуем схему
        DealRenderer.render(deal);
        // 4. Сохраняем
        saveDeal();
    } catch (error) {
        console.error("Ошибка при обновлении: ", error);
    } finally {
        isRefreshing = false;
    }
}

function saveDeal() {
    if (!deal) {
        console.error("Нет данных для сохранения");
        return false;
    }
    return DealStorage.save(deal);
}

function loadDeal() {
    try {
        const loaded = DealStorage.load();
        // Исправлена проверка на наличие данных
        if (loaded && loaded.objects) {
            deal = loaded;
        } else {
            deal = DealModel.createDeal();
        }
    } catch (error) {
        console.error("Ошибка загрузки: ", error);
        deal = DealModel.createDeal();
    }
}

function newProject() {
    const ok = confirm("Создать новый проект? Все несохраненные данные будут потеряны.");
    if (!ok) return;
    
    DealStorage.clear();
    deal = DealModel.createDeal();
    deal.objects.push(DealModel.createObject());
    
    // Перезапускаем UI с чистыми данными
    DealUI.init("#editor", deal);
    refreshAll();
}

function exportJson() {
    if (!deal) {
        alert("Нет данных для экспорта");
        return;
    }
    DealStorage.exportJson(deal);
}

function importJson(event) {
    const file = event.target.files[0];
    if (!file) return;

    const loadingIndicator = showLoadingIndicator();
    
    DealStorage.importJson(file).then(loadedDeal => {
        if (validateDealStructure(loadedDeal)) {
            deal = loadedDeal;
            DealUI.init("#editor", deal);
            refreshAll();
            alert("Файл успешно загружен");
        } else {
            alert("Ошибка: неверная структура файла");
        }
    }).catch(error => {
        console.error("Ошибка импорта: ", error);
        alert("Ошибка загрузки файла: " + error.message);
    }).finally(() => {
        if (loadingIndicator) loadingIndicator.remove();
        event.target.value = '';
    });
}

function validateDealStructure(data) {
    if (!data || typeof data !== 'object') return false;
    if (!data.objects || !Array.isArray(data.objects)) return false;
    return true;
}

function showLoadingIndicator() {
    const div = document.createElement("div");
    div.textContent = "Загрузка...";
    div.style.position = "fixed";
    div.style.top = "50%";
    div.style.left = "50%";
    div.style.transform = "translate(-50%, -50%)";
    div.style.background = "white";
    div.style.padding = "20px";
    div.style.borderRadius = "10px";
    div.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)";
    div.style.zIndex = "9999";
    document.body.appendChild(div);
    return div;
}

function exportPdf() {
    const originalTitle = document.title;
    document.title = "Конструктор Сделок - Экспорт";
    window.print();
    document.title = originalTitle;
}

function createToolbar() {
    const old = document.querySelector(".top-toolbar");
    if (old) {
        old.remove();
    }
    const bar = document.createElement("div");
    bar.className = "top-toolbar";
    bar.style.cssText = "position:fixed; top:10px; right:10px; z-index:1000; display:flex; gap:10px; background:white; padding:10px; border-radius:12px; box-shadow:0 2px 12px rgba(0,0,0,0.1);";
    bar.innerHTML = `
        <button onclick="newProject()" style="padding:8px 16px; border:1px solid #cbd5e1; border-radius:8px; background:white; cursor:pointer;">Новый</button> 
        <button onclick="exportJson()" style="padding:8px 16px; border:1px solid #cbd5e1; border-radius:8px; background:white; cursor:pointer;">JSON Экспорт</button> 
        <button onclick="exportPdf()" style="padding:8px 16px; border:1px solid #cbd5e1; border-radius:8px; background:white; cursor:pointer;">PDF / Печать</button> 
        <label style="padding:8px 16px; border:1px solid #cbd5e1; border-radius:8px; background:white; cursor:pointer; display:inline-block;"> 
            Загрузить JSON 
            <input type="file" accept=".json" onchange="importJson(event)" hidden> 
        </label>
    `;
    document.body.appendChild(bar);
}

window.refreshAll = refreshAll;
window.saveDeal = saveDeal;
window.newProject = newProject;
window.exportPdf = exportPdf;
window.exportJson = exportJson;
window.importJson = importJson;

const printStyle = document.createElement('style');
printStyle.textContent = `@media print { .top-toolbar, .editor-toolbar, .btn, button, .import-btn { display: none !important; } .editor-panel { display: none !important; } .diagram-panel { display: block !important; padding: 0 !important; } .flow-card { break-inside: avoid; page-break-inside: avoid; } body { background: white; } }`;
document.head.appendChild(printStyle);