/*
RENDERER V4 - СИНХРОНИЗИРОВАН
*/
const DealRenderer = (() => {
    let root = null;
    function init(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            console.error("DealRenderer: root element not found ", selector);
            return;
        }
        root = element;
    }

    function render(deal) {
        if (!root) {
            console.error("DealRenderer: root not initialized");
            return;
        }
        
        if (!deal || !deal.objects) {
            console.error("DealRenderer: invalid deal data");
            root.innerHTML = "<div style='padding:20px; text-align:center;'>Нет данных для отображения</div>";
            return;
        }
        
        root.innerHTML = "";

        const wrapper = document.createElement("div");
        wrapper.className = "chain-wrapper";

        deal.objects.forEach((object, index) => {
            if (object) {
                wrapper.appendChild(renderDealCard(object, deal, index));
                
                if (index < deal.objects.length - 1) {
                    wrapper.appendChild(renderTransitionArrow(object, deal.objects[index + 1]));
                }
            }
        });

        root.appendChild(wrapper);
    }

    function renderDealCard(object, deal, index) {
        const card = document.createElement("div");
        card.className = "deal-card";

        const header = document.createElement("div");
        header.className = "deal-header";
        header.innerHTML = `
            <div class="deal-title">
                <span>🏠 СДЕЛКА №${index + 1}</span>
                <span class="deal-badge">${escapeHtml(object.address || "Новый объект")}</span>
            </div>
        `;
        card.appendChild(header);

        const content = document.createElement("div");
        content.className = "deal-content";

        const grid = document.createElement("div");
        grid.className = "deal-grid";

        grid.appendChild(renderBuyerColumn(object));
        grid.appendChild(renderColumnArrow());
        grid.appendChild(renderObjectColumn(object));
        grid.appendChild(renderColumnArrow());
        grid.appendChild(renderBankColumn(object));
        grid.appendChild(renderColumnArrow());
        grid.appendChild(renderSellerColumn(object));

        content.appendChild(grid);
        card.appendChild(content);

        return card;
    }

    function renderBuyerColumn(object) {
        const column = document.createElement("div");
        column.className = "deal-column";

        const header = document.createElement("div");
        header.className = "column-header";
        header.innerHTML = `<span>👤</span> ПОКУПАТЕЛЬ`;
        column.appendChild(header);

        const content = document.createElement("div");
        content.className = "column-content";

        if (object.buyers && object.buyers.length > 0) {
            object.buyers.forEach(buyer => {
                if (!buyer) return;
                
                const buyerDiv = document.createElement("div");
                buyerDiv.className = "buyer-item";

                let html = `<div class="buyer-name"><span>👤</span> ${escapeHtml(buyer.name || "Без имени")}</div>`;
                
                if (buyer.ownFunds > 0) {
                    html += `<div class="buyer-detail"><span class="label">💰 Собственные:</span> <span class="value">${moneyExact(buyer.ownFunds)}</span></div>`;
                }
                
                if (buyer.additionalOwnFunds > 0) {
                    html += `<div class="buyer-detail"><span class="label">💵 Доплата своими:</span> <span class="value">${moneyExact(buyer.additionalOwnFunds)}</span></div>`;
                }
                
                if (buyer.mortgageFunds > 0) {
                    html += `<div class="buyer-detail"><span class="label">🏦 Ипотека:</span> <span class="value">${moneyExact(buyer.mortgageFunds)}</span></div>`;
                }
                
                if (buyer.agent && buyer.agent.name) {
                    html += `<div class="buyer-detail"><span class="label">🤝 Агент:</span> <span class="value">${escapeHtml(buyer.agent.name)}</span></div>`;
                    if (buyer.agent.commission > 0) {
                        html += `<div class="buyer-detail"><span class="label">💸 Комиссия:</span> <span class="value">${moneyExact(buyer.agent.commission)}</span></div>`;
                    }
                }
                
                buyerDiv.innerHTML = html;
                content.appendChild(buyerDiv);
            });
        } else {
            content.innerHTML = '<div style="padding:12px; text-align:center; font-size:11px; color:#94a3b8;">Нет покупателей</div>';
        }

        column.appendChild(content);
        return column;
    }

    function renderObjectColumn(object) {
        const column = document.createElement("div");
        column.className = "deal-column";

        const header = document.createElement("div");
        header.className = "column-header";
        header.innerHTML = `<span>🏠</span> ОБЪЕКТ`;
        column.appendChild(header);

        const content = document.createElement("div");
        content.className = "column-content";

        content.innerHTML = `
            <div class="object-address">${escapeHtml(object.address || "Без адреса")}</div>
            <div class="object-type">${escapeHtml(object.type || "Квартира")}</div>
            <div class="object-details">
               ${object.rooms ? `${object.rooms} ком. • ` : ''}
               ${object.area ? `${object.area} м²` : ''}
            </div>
            <div class="object-price">${moneyExact(object.price)}</div>
        `;

        column.appendChild(content);
        return column;
    }

    function renderBankColumn(object) {
        const column = document.createElement("div");
        column.className = "deal-column";

        const header = document.createElement("div");
        header.className = "column-header";
        header.innerHTML = `<span>🏦</span> БАНК`;
        column.appendChild(header);

        const content = document.createElement("div");
        content.className = "column-content";

        if (object.accounts && object.accounts.length > 0) {
            object.accounts.forEach(account => {
                if (!account) return;
                if (account.amount === 0) return;
                
                const accountDiv = document.createElement("div");
                accountDiv.className = `bank-account ${account.calculated ? 'calculated' : ''}`;
                
                let title = account.title;
                if (title.length > 22) {
                    title = title.substring(0, 20) + '..';
                }
                
                accountDiv.innerHTML = `
                    <span class="bank-account-title" title="${escapeHtml(account.title)}">${escapeHtml(title)}</span>
                    <span class="bank-account-amount">${moneyExact(account.amount)}</span>
                `;
                content.appendChild(accountDiv);
            });

            const buyerCommission = (object.buyers || []).reduce((sum, b) => sum + (b.agent?.commission || 0), 0);
            const totalDeal = object.price + buyerCommission;
            
            const totalDiv = document.createElement("div");
            totalDiv.className = "bank-account";
            totalDiv.style.background = "#e0e7ff";
            totalDiv.style.marginTop = "8px";
            totalDiv.style.fontWeight = "700";
            totalDiv.innerHTML = `
                <span class="bank-account-title">📊 ВСЕГО НА СДЕЛКУ</span>
                <span class="bank-account-amount">${moneyExact(totalDeal)}</span>
            `;
            content.appendChild(totalDiv);
        } else {
            content.innerHTML = '<div style="padding:12px; text-align:center; font-size:11px; color:#94a3b8;">Нет данных</div>';
        }

        column.appendChild(content);
        return column;
    }

    function renderSellerColumn(object) {
        const column = document.createElement("div");
        column.className = "deal-column";

        const header = document.createElement("div");
        header.className = "column-header";
        header.innerHTML = `<span>💰</span> ПРОДАВЕЦ`;
        column.appendChild(header);

        const content = document.createElement("div");
        content.className = "column-content";

        if (object.sellers && object.sellers.length > 0) {
            object.sellers.forEach(seller => {
                if (!seller) return;
                
                const sellerDiv = document.createElement("div");
                sellerDiv.className = "seller-item";

                let html = `
                    <div class="seller-name">${escapeHtml(seller.name || "Без имени")}</div>
                    <div class="seller-share">📊 Доля: ${seller.share}%</div>
                    <div class="seller-amount">💰 Получает: ${moneyExact(seller.netAmount)}</div>
                `;
                
                if (seller.calculatedTransit && seller.calculatedTransit > 0) {
                    html += `<div class="seller-transit">➜ В покупку: ${moneyExact(seller.calculatedTransit)}</div>`;
                }
                
                if (seller.agent && seller.agent.name && seller.agent.commission > 0) {
                    let paymentText = "";
                    const paymentMode = seller.agent.paymentMode || "seller";
                    if (paymentMode === "seller") paymentText = "из средств продавца";
                    else if (paymentMode === "bank") paymentText = "через банк";
                    else paymentText = "от покупателя";
                    
                    html += `
                        <div class="seller-agent">
                           🤝 ${escapeHtml(seller.agent.name)}<br>
                           💸 ${moneyExact(seller.agent.commission)}<br>
                            <span style="font-size:9px;">📌 ${paymentText}</span>
                        </div>
                    `;
                }
                
                sellerDiv.innerHTML = html;
                content.appendChild(sellerDiv);
            });

            const totalToSellers = object.sellers.reduce((sum, s) => sum + (s.netAmount || 0), 0);
            const totalDiv = document.createElement("div");
            totalDiv.className = "seller-item";
            totalDiv.style.background = "#e0e7ff";
            totalDiv.style.marginTop = "8px";
            totalDiv.innerHTML = `
                <div class="seller-name" style="color:#1e40af;">📊 ВСЕГО ПРОДАВЦАМ</div>
                <div class="seller-amount" style="color:#1e40af;">${moneyExact(totalToSellers)}</div>
            `;
            content.appendChild(totalDiv);
        } else {
            content.innerHTML = '<div style="padding:12px; text-align:center; font-size:11px; color:#94a3b8;">Нет продавцов</div>';
        }

        column.appendChild(content);
        return column;
    }

    function renderColumnArrow() {
        const div = document.createElement("div");
        div.className = "column-arrow";
        div.innerHTML = "→";
        return div;
    }

    function renderTransitionArrow(fromObject, toObject) {
        const container = document.createElement("div");
        container.className = "transition-arrow";
        
        let transitionAmount = 0;
        
        if (fromObject.sellers) {
            fromObject.sellers.forEach(seller => {
                if (seller.calculatedTransit && seller.calculatedTransit > 0) {
                    transitionAmount += seller.calculatedTransit;
                }
            });
        }
        
        if (transitionAmount > 0) {
            container.innerHTML = `
                <div class="transition-label-mini">
                   ⬇ ТРАНЗИТ ${moneyExact(transitionAmount)} ⬇
                </div>
            `;
        } else {
            container.innerHTML = `<div class="transition-label-mini">⬇ ПЕРЕХОД ⬇</div>`;
        }
        
        return container;
    }

    function moneyExact(value) {
        const num = Number(value);
        if (isNaN(num) || num === 0) return "";
        
        if (num >= 1000000) {
            const millions = num / 1000000;
            return millions.toFixed(2).replace(/\.?0+$/, '') + " млн ₽";
        }
        
        if (num >= 1000) {
            return (num / 1000).toFixed(0) + " тыс ₽";
        }
        
        return num.toLocaleString("ru-RU") + " ₽";
    }

    function escapeHtml(text) {
        if (!text) return "";
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    return {
        init,
        render
    };
})();