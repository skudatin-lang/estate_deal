/*
UI V5.1 - FIX ALTERNATIVE SELECTION & BUYER SYNC
*/
const DealUI = (() => {
    let root = null;
    let deal = null;
    let updateTimeout = null;

    function init(selector, dealRef) {
        const element = document.querySelector(selector);
        if (!element) {
            console.error("DealUI: root element not found ", selector);
            return;
        }
        root = element;
        deal = dealRef;
        render();
    }

    function refresh() {
        if (!deal) return;
        if (updateTimeout) clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
            try {
                // 1. Сначала считаем всю математику
                DealCalculator.rebuild(deal);
                
                // 2. Синхронизируем поля ввода с расчетами (Ипотека, Свои)
                syncInputsWithCalculations();
                
                // 3. Рендерим схему
                DealRenderer.render(deal);
                
                if (window.saveDeal) {
                    window.saveDeal();
                }
            } catch (error) {
                console.error("Ошибка при обновлении UI: ", error);
            }
        }, 100);
    }

    // Функция заполнения пустых полей из расчетов
    function syncInputsWithCalculations() {
        if (!deal || !deal.objects) return;
        deal.objects.forEach(object => {
            if (!object || !object.buyers) return;
            object.buyers.forEach(buyer => {
                // Если это альтернативный покупатель (транзитный)
                if (buyer.name && buyer.agent && buyer.agent.commission === 0) {
                    // Подтягиваем ипотеку, если поле пустое, но расчет есть
                    if (!buyer.mortgageFunds || buyer.mortgageFunds === 0) {
                        const mortgageAcc = object.accounts.find(a => a.title.includes("Ипотека"));
                        if (mortgageAcc && mortgageAcc.amount > 0) {
                            buyer.mortgageFunds = mortgageAcc.amount;
                        }
                    }
                }
            });
        });
    }

    function render() {
        if (!root || !deal) return;
        root.innerHTML = "";
        if (!deal.objects || deal.objects.length === 0) {
            root.appendChild(createEmptyMessage());
            return;
        }
        deal.objects.forEach((object, index) => {
            if (object) {
                root.appendChild(objectEditor(object, index));
            }
        });
        createFloatingButtons();
    }

    function createFloatingButtons() {
        const oldAddBtn = document.querySelector(".floating-add-btn");
        const oldRemoveBtn = document.querySelector(".floating-remove-btn");
        if (oldAddBtn) oldAddBtn.remove();
        if (oldRemoveBtn) oldRemoveBtn.remove();

        const addBtn = document.createElement("button");
        addBtn.className = "floating-add-btn";
        addBtn.innerHTML = `<span>➕</span> Добавить объект`;
        addBtn.onclick = () => {
            if (deal && deal.objects) {
                deal.objects.push(DealModel.createObject());
                render();
                refresh();
            }
        };
        document.body.appendChild(addBtn);

        const removeBtn = document.createElement("button");
        removeBtn.className = "floating-remove-btn";
        removeBtn.innerHTML = `<span>🗑</span> Удалить последний`;
        removeBtn.onclick = () => {
            if (deal && deal.objects && deal.objects.length > 1) {
                if (confirm("Удалить последний объект?")) {
                    deal.objects.pop();
                    cleanAllTransitionsToDeleted();
                    render();
                    refresh();
                }
            } else {
                alert("Нельзя удалить единственный объект");
            }
        };
        document.body.appendChild(removeBtn);
    }

    function cleanAllTransitionsToDeleted() {
        if (!deal || !deal.objects) return;
        const existingIds = deal.objects.map(obj => String(obj.id));
        deal.objects.forEach(obj => {
            if (obj && obj.sellers) {
                obj.sellers.forEach(seller => {
                    if (seller && seller.transitions) {
                        seller.transitions = seller.transitions.filter(t => 
                            t && t.toObjectId && existingIds.includes(String(t.toObjectId))
                        );
                    }
                });
            }
        });
        // После удаления объекта нужно пересинхронизировать покупателей
        resyncAllBuyers();
    }

    function createEmptyMessage() {
        const div = document.createElement("div");
        div.className = "editor-card";
        div.style.textAlign = "center";
        div.style.padding = "40px";
        div.style.margin = "20px";
        div.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 16px;">🏠</div>
            <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Нет объектов</div>
            <div style="font-size: 13px; color: #64748b;">Нажмите кнопку "Добавить объект" чтобы начать</div>
        `;
        return div;
    }

    function objectEditor(object, index) {
        const card = document.createElement("div");
        card.className = "deal-block-wrapper";

        // 1. ЗАГОЛОВОК
        const header = document.createElement("div");
        header.className = "deal-block-header";
        const title = document.createElement("div");
        title.className = "editor-title";
        title.innerHTML = `<span>🏢</span> Сделка №${index + 1}: ${object.address || "новый объект"}`;
        header.appendChild(title);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-object-btn";
        deleteBtn.innerHTML = `<span>🗑</span> Удалить`;
        deleteBtn.onclick = () => {
            if (deal.objects.length > 1) {
                if (confirm(`Удалить объект "${object.address || index + 1}"?`)) {
                    const idx = deal.objects.findIndex(o => o.id === object.id);
                    if (idx !== -1) {
                        deal.objects.splice(idx, 1);
                        cleanAllTransitionsToDeleted();
                        render();
                        refresh();
                    }
                }
            } else {
                alert("Нельзя удалить единственный объект");
            }
        };
        header.appendChild(deleteBtn);
        card.appendChild(header);

        // 2. БЛОК ОБЪЕКТА
        const objectSection = document.createElement("div");
        objectSection.className = "deal-section object-section";
        const objTitle = document.createElement("div");
        objTitle.className = "section-label";
        objTitle.textContent = "📍 Характеристики объекта";
        objectSection.appendChild(objTitle);

        const objGrid = document.createElement("div");
        objGrid.className = "two-col-grid";

        const col1 = document.createElement("div");
        col1.className = "grid-col";
        col1.appendChild(compactTextField("Адрес", object.address, v => { object.address = v; refresh(); }));
        col1.appendChild(compactTextField("Тип объекта", object.type, v => { object.type = v; refresh(); }));
        
        const roomsAreaRow = document.createElement("div");
        roomsAreaRow.className = "inline-fields";
        roomsAreaRow.appendChild(compactTextField("Комнат", object.rooms, v => { object.rooms = v; refresh(); }));
        roomsAreaRow.appendChild(compactTextField("Площадь (м²)", object.area, v => { object.area = v; refresh(); }));
        col1.appendChild(roomsAreaRow);
        col1.appendChild(compactNumberField("Цена (₽)", object.price, v => { object.price = validateNumber(v, 0); refresh(); }));

        const col2 = document.createElement("div");
        col2.className = "grid-col";
        
        const advancesContainer = document.createElement("div");
        advancesContainer.className = "advances-vertical-stack";
        const advLabel = document.createElement("label");
        advLabel.textContent = "Авансы";
        advancesContainer.appendChild(advLabel);

        const advancesList = document.createElement("div");
        advancesList.className = "advances-list";
        if (object.advances && object.advances.length > 0) {
            object.advances.forEach((advance, idx) => {
                advancesList.appendChild(compactAdvanceEditorMini(advance, idx, object));
            });
        }
        const addAdvBtn = document.createElement("button");
        addAdvBtn.className = "btn btn-xs btn-dashed";
        addAdvBtn.textContent = "+ Аванс";
        addAdvBtn.onclick = () => {
            if (!object.advances) object.advances = [];
            object.advances.push(DealModel.createAdvance());
            render();
            refresh();
        };
        advancesList.appendChild(addAdvBtn);
        advancesContainer.appendChild(advancesList);
        col2.appendChild(advancesContainer);

        objGrid.appendChild(col1);
        objGrid.appendChild(col2);
        objectSection.appendChild(objGrid);
        card.appendChild(objectSection);

        // 3. БЛОК ПРОДАВЦОВ
        const sellerSection = document.createElement("div");
        sellerSection.className = "deal-section seller-section";
        const sellTitle = document.createElement("div");
        sellTitle.className = "section-label";
        sellTitle.textContent = "💼 Продавцы";
        sellerSection.appendChild(sellTitle);

        const sellersScrollRow = document.createElement("div");
        sellersScrollRow.className = "horizontal-scroll-row";
        if (object.sellers && object.sellers.length > 0) {
            object.sellers.forEach((seller, idx) => {
                sellersScrollRow.appendChild(compactSellerEditor(seller, object, idx));
            });
        }
        const addSellBtn = document.createElement("button");
        addSellBtn.className = "btn btn-xs btn-dashed scroll-add-btn";
        addSellBtn.textContent = "+ Продавец";
        addSellBtn.onclick = () => {
            if (!object.sellers) object.sellers = [];
            object.sellers.push(DealModel.createSeller());
            render();
            refresh();
        };
        sellersScrollRow.appendChild(addSellBtn);
        sellerSection.appendChild(sellersScrollRow);
        card.appendChild(sellerSection);

        // 4. БЛОК ПОКУПАТЕЛЕЙ
        const buyerSection = document.createElement("div");
        buyerSection.className = "deal-section buyer-section";
        const buyTitle = document.createElement("div");
        buyTitle.className = "section-label";
        buyTitle.textContent = "👤 Покупатели";
        buyerSection.appendChild(buyTitle);

        const buyersGrid = document.createElement("div");
        buyersGrid.className = "buyers-grid";
        if (object.buyers && object.buyers.length > 0) {
            object.buyers.forEach((buyer, idx) => {
                buyersGrid.appendChild(compactBuyerEditor(buyer, idx, object));
            });
        }
        const addBuyBtn = document.createElement("button");
        addBuyBtn.className = "btn btn-xs btn-dashed";
        addBuyBtn.textContent = "+ Покупатель";
        addBuyBtn.onclick = () => {
            if (!object.buyers) object.buyers = [];
            object.buyers.push(DealModel.createBuyer());
            render();
            refresh();
        };
        buyersGrid.appendChild(addBuyBtn);
        buyerSection.appendChild(buyersGrid);
        card.appendChild(buyerSection);

        return card;
    }

    function compactAdvanceEditorMini(advance, index, object) {
        const wrap = document.createElement("div");
        wrap.className = "mini-advance-card";
        
        const header = document.createElement("div");
        header.className = "mini-advance-header";
        header.innerHTML = `<span class="sub-title">Аванс ${index + 1}</span>`;
        
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-sub-btn";
        deleteBtn.innerHTML = "✖";
        deleteBtn.onclick = () => {
            if (object.advances) {
                object.advances.splice(index, 1);
                render();
                refresh();
            }
        };
        header.appendChild(deleteBtn);
        wrap.appendChild(header);

        wrap.appendChild(compactTextField("Название", advance.title, v => { advance.title = v; refresh(); }));
        wrap.appendChild(compactNumberField("Сумма", advance.amount, v => { advance.amount = validateNumber(v, 0); refresh(); }));
        
        return wrap;
    }

    function compactBuyerEditor(buyer, index, object) {
        const wrap = document.createElement("div");
        wrap.className = "sub-editor buyer-sub-editor";
        
        const header = document.createElement("div");
        header.className = "sub-header";
        header.innerHTML = `<span class="sub-title">Покупатель ${index + 1}</span>`;
        
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-sub-btn";
        deleteBtn.innerHTML = "✖";
        deleteBtn.onclick = () => {
            if (object.buyers) {
                object.buyers.splice(index, 1);
                render();
                refresh();
            }
        };
        header.appendChild(deleteBtn);
        wrap.appendChild(header);

        wrap.appendChild(compactTextField("ФИО", buyer.name, v => { buyer.name = v; refresh(); }));
        
        const fundsRow = document.createElement("div");
        fundsRow.className = "inline-fields";
        fundsRow.appendChild(compactNumberField("Свои (₽)", buyer.ownFunds, v => { buyer.ownFunds = validateNumber(v, 0); refresh(); }));
        fundsRow.appendChild(compactNumberField("Доплата (₽)", buyer.additionalOwnFunds, v => { buyer.additionalOwnFunds = validateNumber(v, 0); refresh(); }));
        wrap.appendChild(fundsRow);

        wrap.appendChild(compactNumberField("Ипотека (₽)", buyer.mortgageFunds, v => { buyer.mortgageFunds = validateNumber(v, 0); refresh(); }));
        
        if (!buyer.agent) buyer.agent = { name: "", commission: 0 };
        wrap.appendChild(compactTextField("Агент", buyer.agent.name, v => { buyer.agent.name = v; refresh(); }));
        wrap.appendChild(compactNumberField("Комиссия (₽)", buyer.agent.commission, v => { buyer.agent.commission = validateNumber(v, 0); refresh(); }));

        return wrap;
    }

    function compactSellerEditor(seller, currentObject, index) {
        const wrap = document.createElement("div");
        wrap.className = "sub-editor seller-sub-editor";
        
        const header = document.createElement("div");
        header.className = "sub-header";
        header.innerHTML = `<span class="sub-title">Продавец ${index + 1}</span>`;
        
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-sub-btn";
        deleteBtn.innerHTML = "✖";
        deleteBtn.onclick = () => {
            if (currentObject.sellers) {
                currentObject.sellers.splice(index, 1);
                render();
                refresh();
            }
        };
        header.appendChild(deleteBtn);
        wrap.appendChild(header);

        wrap.appendChild(compactTextField("ФИО", seller.name, v => { seller.name = v; refresh(); }));
        wrap.appendChild(compactNumberField("Доля (%)", seller.share, v => { seller.share = validateNumber(v, 0, 100); refresh(); }));
        
        if (!seller.agent) seller.agent = { name: "", commission: 0, paymentMode: "seller" };
        wrap.appendChild(compactTextField("Агент", seller.agent.name, v => { seller.agent.name = v; refresh(); }));
        wrap.appendChild(compactNumberField("Комиссия (₽)", seller.agent.commission, v => { seller.agent.commission = validateNumber(v, 0); refresh(); }));
        
        const modeSelect = document.createElement("select");
        modeSelect.className = "input";
        modeSelect.innerHTML = `
            <option value="seller">💰 Из средств продавца</option>
            <option value="bank">🏦 Через банк</option>
            <option value="buyer">👤 От покупателя</option>
        `;
        modeSelect.value = seller.agent.paymentMode || "seller";
        modeSelect.onchange = e => { seller.agent.paymentMode = e.target.value; refresh(); };
        
        const modeWrap = document.createElement("div");
        modeWrap.className = "field";
        modeWrap.appendChild(document.createTextNode("Оплата"));
        modeWrap.appendChild(modeSelect);
        wrap.appendChild(modeWrap);

        const transTitle = document.createElement("div");
        transTitle.className = "section-label-mini";
        transTitle.textContent = "🔄 Покупки";
        wrap.appendChild(transTitle);

        if (seller.transitions && seller.transitions.length > 0) {
            seller.transitions.forEach((transition, idx) => {
                wrap.appendChild(compactTransitionEditor(seller, transition, idx, currentObject));
            });
        }

        const addTransBtn = document.createElement("button");
        addTransBtn.className = "btn btn-xs btn-dashed";
        addTransBtn.textContent = "+ Покупка";
        addTransBtn.onclick = () => {
            if (!seller.transitions) seller.transitions = [];
            const newTransition = DealModel.createTransition();
            // Автоматически ставим сумму, равную чистому доходу продавца
            newTransition.amount = seller.netAmount || 0;
            seller.transitions.push(newTransition);
            render();
            refresh();
        };
        wrap.appendChild(addTransBtn);

        return wrap;
    }

    function compactTransitionEditor(seller, transition, index, currentObject) {
        const wrap = document.createElement("div");
        wrap.className = "sub-editor sub-editor-nested";
        wrap.style.marginTop = "6px";
        
        const header = document.createElement("div");
        header.className = "sub-header";
        header.innerHTML = `<span class="sub-title">Переход ${index + 1}</span>`;
        
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-sub-btn";
        deleteBtn.innerHTML = "✖";
        deleteBtn.onclick = () => {
            if (seller.transitions) {
                seller.transitions.splice(index, 1);
                resyncAllBuyers();
                render();
                refresh();
            }
        };
        header.appendChild(deleteBtn);
        wrap.appendChild(header);

        const select = document.createElement("select");
        select.className = "input";
        select.innerHTML = `<option value="">Выберите объект</option>`;
        
        if (deal && deal.objects) {
            deal.objects.forEach(object => {
                if (String(object.id) !== String(currentObject.id)) {
                    const option = document.createElement("option");
                    option.value = object.id;
                    option.textContent = `#${object.id} ${object.address || "без адреса"} (${money(object.price)})`;
                    if (String(transition.toObjectId) === String(object.id)) option.selected = true;
                    select.appendChild(option);
                }
            });
        }

        select.onchange = e => {
            if (e.target.value) {
                transition.toObjectId = Number(e.target.value);
                const targetObject = deal.objects.find(x => x.id === transition.toObjectId);
                if (targetObject) {
                    // Умный расчет: если сумма перехода больше цены объекта, ограничиваем её ценой
                    const maxNeeded = targetObject.price;
                    let proposedAmount = seller.netAmount || 0;
                    if (proposedAmount > maxNeeded && maxNeeded > 0) {
                        proposedAmount = maxNeeded;
                    }
                    transition.amount = proposedAmount;
                    
                    let buyer = targetObject.buyers.find(b => b.name === seller.name);
                    if (!buyer) {
                        buyer = DealModel.createBuyer();
                        buyer.name = seller.name;
                        targetObject.buyers.push(buyer);
                    }
                    buyer.ownFunds = transition.amount;
                }
                refresh();
            } else {
                transition.toObjectId = null;
                refresh();
            }
        };

        const selectWrap = document.createElement("div");
        selectWrap.className = "field";
        selectWrap.appendChild(document.createTextNode("Объект"));
        selectWrap.appendChild(select);
        wrap.appendChild(selectWrap);

        const amountInput = document.createElement("input");
        amountInput.type = "number";
        amountInput.className = "input";
        amountInput.value = transition.amount || 0;
        amountInput.min = 0;
        amountInput.step = "any";
        amountInput.oninput = e => {
            transition.amount = validateNumber(e.target.value, 0);
            const targetObject = deal.objects.find(x => x.id === transition.toObjectId);
            if (targetObject && transition.toObjectId) {
                const buyer = targetObject.buyers.find(b => b.name === seller.name);
                if (buyer) {
                    buyer.ownFunds = transition.amount;
                }
            }
            refresh();
        };

        const amountWrap = document.createElement("div");
        amountWrap.className = "field";
        amountWrap.appendChild(document.createTextNode("Сумма (₽)"));
        amountWrap.appendChild(amountInput);
        wrap.appendChild(amountWrap);

        return wrap;
    }

    /**
     * ИСПРАВЛЕННАЯ ФУНКЦИЯ СИНХРОНИЗАЦИИ
     * Раньше она удаляла всех именованных покупателей без комиссии.
     * Теперь она сохраняет тех, кто привязан к активным переходам.
     */
    function resyncAllBuyers() {
        if (!deal || !deal.objects) return;

        // 1. Собираем список всех активных транзитных покупателей (по имени и ID объекта)
        const activeTransitBuyers = new Set();
        deal.objects.forEach(sourceObj => {
            if (sourceObj.sellers) {
                sourceObj.sellers.forEach(seller => {
                    if (seller.transitions) {
                        seller.transitions.forEach(t => {
                            if (t.toObjectId && seller.name) {
                                // Ключ: ID целевого объекта + Имя продавца
                                activeTransitBuyers.add(`${t.toObjectId}::${seller.name}`);
                            }
                        });
                    }
                });
            }
        });

        // 2. Фильтруем покупателей, сохраняя обычных и активных транзитных
        deal.objects.forEach(object => {
            if (object.buyers) {
                object.buyers = object.buyers.filter(buyer => {
                    // Всегда оставляем анонимных (обычных) покупателей
                    if (!buyer.name) return true;
                    
                    // Оставляем покупателей с комиссией (агенты/особые условия)
                    if (buyer.agent && buyer.agent.commission > 0) return true;

                    // Оставляем транзитных, если для них есть активный переход
                    const key = `${object.id}::${buyer.name}`;
                    if (activeTransitBuyers.has(key)) return true;

                    // Все остальные именованные без комиссии и без перехода - удаляются
                    return false;
                });
            }
        });

        // 3. Запускаем стандартную синхронизацию из FlowEngine для создания недостающих
        FlowEngine.syncBuyersFromTransitions(deal);
    }

    function compactTextField(label, value, callback) {
        const wrap = document.createElement("div");
        wrap.className = "field";
        const lbl = document.createElement("label");
        lbl.textContent = label;
        const input = document.createElement("input");
        input.className = "input";
        input.value = value || "";
        input.oninput = e => callback(e.target.value);
        wrap.appendChild(lbl);
        wrap.appendChild(input);
        return wrap;
    }

    function compactNumberField(label, value, callback) {
        const wrap = document.createElement("div");
        wrap.className = "field";
        const lbl = document.createElement("label");
        lbl.textContent = label;
        const input = document.createElement("input");
        input.type = "number";
        input.className = "input";
        input.value = value || 0;
        input.min = 0;
        input.step = "any";
        input.oninput = e => callback(e.target.value);
        wrap.appendChild(lbl);
        wrap.appendChild(input);
        return wrap;
    }

    function validateNumber(value, min = null, max = null) {
        let num = Number(value);
        if (isNaN(num)) return 0;
        if (min !== null && num < min) return min;
        if (max !== null && num > max) return max;
        return num;
    }

    function money(value) {
        const num = Number(value);
        if (isNaN(num)) return "0 ₽";
        if (num >= 1000000) return (num / 1000000).toFixed(1) + " млн ₽";
        if (num >= 1000) return (num / 1000).toFixed(0) + " тыс ₽";
        return num.toLocaleString("ru-RU") + " ₽";
    }

    return { init, render };
})();