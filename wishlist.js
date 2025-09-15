// (function () {
//     const WKEY = 'myshop_wishlist_v1';
//     const container = document.getElementById('wishlistContainer');

//     const readWishlist = () => {
//         try {
//             return JSON.parse(localStorage.getItem(WKEY) || '[]');
//         } catch (e) {
//             return [];
//         }
//     };
//     const saveWishlist = (items) => localStorage.setItem(WKEY, JSON.stringify(items));

//     const render = () => {
//         const items = readWishlist();
//         if (!items.length) {
//             container.innerHTML = `
//           <div class="text-center py-16">
//             <p class="text-gray-600 mb-6">Sizning wishlist bo'sh.</p>
//             <a href="index.html" class="inline-block px-6 py-3 bg-teal-600 text-white rounded-lg">Shop now</a>
//           </div>
//         `;
//             return;
//         }

//         // grid of wishlist items
//         container.innerHTML = `
//         <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
//           ${items.map(item => `
//             <div class="bg-white rounded-[20px] shadow p-6 flex flex-col">
//               <div class="flex justify-between items-start">
//                 <span class="text-sm text-gray-500">${item.category || ''}</span>
//                 <button class="remove-btn text-red-500" data-id="${item.id}" aria-label="Remove ${item.title}">Remove</button>
//               </div>

//               <div class="flex items-center justify-center h-44 my-4">
//                 <img src="${item.image}" alt="${item.title}" class="max-h-full object-contain">
//               </div>

//               <h3 class="font-semibold text-lg mb-2">${item.title}</h3>
//               <div class="flex items-center justify-between mt-auto">
//                 <div>
//                   <div class="text-sm line-through text-gray-400">$${item.oldPrice || ''}</div>
//                   <div class="text-[18px] font-bold text-teal-800">$${item.price}</div>
//                 </div>
//               </div>
//             </div>
//           `).join('')}
//         </div>
//       `;
//     };

//     render();

//     container.addEventListener('click', (e) => {
//         const btn = e.target.closest('.remove-btn');
//         if (!btn) return;
//         const id = btn.dataset.id;
//         const items = readWishlist().filter(i => String(i.id) !== String(id));
//         saveWishlist(items);
//         render();
//     });

//     document.getElementById('clearWishlist').addEventListener('click', () => {
//         if (!confirm('Are you sure you want to clear your wishlist?')) return;
//         saveWishlist([]);
//         render();
//     });
// })();  