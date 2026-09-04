const API_URL = '';

//Crear tienda
        document.getElementById('storeForm').addEventListener('submit', async (e) =>{
            e.preventDefault();
            const name =document.getElementById('storeName').value;
            const email =document.getElementById('storeEmail').value;

            const res = await fetch('/api/store', {
                method: 'post',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify({name, email})
            });
            if (res.ok){
                alert('¡Tienda creada con exito!')
                loadStores();
                document.getElementById('storeForm').reset();
            }else{
                alert('Error al crear la tienda')
            }
        });
        // cargar tienda
        async function loadStores() {
            const res = await fetch('/api/stores');
            const store = await res.json();
            const tbody = document.querySelector('#storesTable tbody');
            tbody.innerHTML = '';
            // Validación de  respuesta antes de recorrerlo
            if (Array.isArray(store)) {
                store.forEach(s => {
                    tbody.innerHTML += `<tr><td>${s.id}</td><td>${s.name}</td><td>${s.email}</td></tr>`;
                });
                } else {
                    console.error("El servidor no devolvió un arreglo:", store);
                }     
        }

        // crear orden
        document.getElementById('orderForm').addEventListener('submit', async (e) =>{
            e.preventDefault();
            const data = {
            storeId: document.getElementById('orderStoreId').value,
            recipientName: document.getElementById('recipientName').value,
            recipientAddress: document.getElementById('recipientAddress').value,
            destinationCommune: document.getElementById('destinationCommune').value,
            totalCost: parseFloat(document.getElementById('totalCost').value),
            trackingCode: document.getElementById('trackingCode').value
            };
            const res = await fetch ('/api/Order', {
                method: 'post',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify(data)
            });
            if (res.ok){
                alert('¡Orden creada con éxito!');
                loadOrders();
                document.getElementById('orderForm').reset();
            } else {
                alert('Error al crear orden');
            }
            
        });
        // Cargar Órdenes
        async function loadOrders() {
            const res = await fetch('/api/orders');
            const orders = await res.json();
            const tbody = document.querySelector('#ordersTable tbody');
            tbody.innerHTML = '';
            orders.forEach(o => {
                tbody.innerHTML += `<tr><td>${o.trackingCode}</td><td>${o.recipientName}</td><td>${o.destinationCommune}</td><td>$${o.totalCost}</td></tr>`;
            });
        }

        // Cargar datos al abrir la página
        loadStores();
        loadOrders();