(function () {
    const WKEY = "myshop_wishlist_v1";
  
    const readWishlist = () =>
      JSON.parse(localStorage.getItem(WKEY) || "[]");
  
    const saveWishlist = (items) =>
      localStorage.setItem(WKEY, JSON.stringify(items));
  
    const isInWishlist = (id) =>
      readWishlist().some((i) => String(i.id) === String(id));
  
    const toggleWishlist = (product) => {
      let items = readWishlist();
      if (isInWishlist(product.id)) {
        items = items.filter((i) => String(i.id) !== String(product.id));
      } else {
        items.push(product);
      }
      saveWishlist(items);
    };
  
    
    const updateUI = () => {
      document.querySelectorAll(".product-card").forEach((card) => {
        const id = card.dataset.id;
        const btn = card.querySelector(".wishlist-btn");
        if (!btn) return;
        if (isInWishlist(id)) {
          btn.classList.add("is-wish");
        } else {
          btn.classList.remove("is-wish");
        }
      });
    };
  

    document.addEventListener("DOMContentLoaded", () => {
      updateUI();
  
      const grid = document.getElementById("productsGrid");
      if (grid) {
        grid.addEventListener("click", (e) => {
          const btn = e.target.closest(".wishlist-btn");
          if (!btn) return;
  
          const card = btn.closest(".product-card");
          const product = {
            id: card.dataset.id,
            title: card.dataset.title,
            price: card.dataset.price,
            oldPrice: card.dataset.oldPrice,
            image: card.dataset.image,
            category: card.dataset.category,
          };
  
          toggleWishlist(product);
          updateUI();
        });
      }
    });
  

    document.addEventListener("DOMContentLoaded", () => {
      const container = document.getElementById("wishlistContainer");
      if (!container) return;
  
      const render = () => {
        const items = readWishlist();
        if (!items.length) {
          container.innerHTML = `
            <div class="text-center py-16">
              <p class="text-gray-600 mb-6">Your wishlist is empty.</p>
              <a href="index.html" class="inline-block px-6 py-3 bg-teal-600 text-white rounded-lg">Shop now</a>
            </div>
          `;
          return;
        }
  
        container.innerHTML = `
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            ${items.map(item => `
              <div class="bg-white rounded-[20px] shadow p-6 flex flex-col">
                <div class="flex justify-between items-start">
                  <span class="text-sm text-gray-500">${item.category || ''}</span>
                  <button class="remove-btn text-red-500" data-id="${item.id}" aria-label="Remove ${item.title}">Remove</button>
                </div>
                <div class="flex items-center justify-center h-44 my-4">
                  <img src="${item.image}" alt="${item.title}" class="max-h-full object-contain">
                </div>
                <h3 class="font-semibold text-lg mb-2">${item.title}</h3>
                <div class="flex items-center justify-between mt-auto">
                  <div>
                    <div class="text-sm line-through text-gray-400">$${item.oldPrice || ''}</div>
                    <div class="text-[18px] font-bold text-teal-800">$${item.price}</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      };
  
      render();
  

      container.addEventListener("click", (e) => {
        const btn = e.target.closest(".remove-btn");
        if (!btn) return;
        const id = btn.dataset.id;
        const items = readWishlist().filter((i) => String(i.id) !== String(id));
        saveWishlist(items);
        render();
      });
  

      const clearBtn = document.getElementById("clearWishlist");
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          if (!confirm("Are you sure you want to clear your wishlist?")) return;
          saveWishlist([]);
          render();
        });
      }
    });
  })();

  {/* <a href="product.html?id=${item.id}" class="px-4 py-2 bg-teal-600 text-white rounded-md">View</a> */}
  