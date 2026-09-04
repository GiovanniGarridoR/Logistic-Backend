"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const pdfkit_1 = __importDefault(require("pdfkit"));
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static('public'));
// 1. Crear un pedido y calcular envío según la comuna
app.post('/api/orders', async (req, res) => {
    console.log('1. ¡Llegó la petición al backend!', req.body);
    try {
        const { storeId, recipientName, recipientAddress, destinationCommune, productPrice } = req.body;
        console.log('2. Buscando comuna en la base de datos:', destinationCommune);
        const rate = await prisma.shippingRate.findUnique({
            where: { commune: destinationCommune },
        });
        console.log('3. Resultado de la base de datos:', rate);
        if (!rate) {
            return res.status(400).json({ error: `No hay cobertura de envío para la comuna: ${destinationCommune}` });
        }
        const totalCost = productPrice + rate.baseCost;
        const trackingCode = `CL-LOG-${Math.floor(10000 + Math.random() * 90000)}`;
        const newOrder = await prisma.order.create({
            data: {
                storeId,
                recipientName,
                recipientAddress,
                destinationCommune,
                totalCost,
                trackingCode,
                status: 'Creado',
            },
        });
        console.log('4. Pedido creado con éxito');
        return res.status(201).json({
            message: 'Pedido creado exitosamente',
            order: newOrder,
        });
    }
    catch (error) {
        console.error('ERROR EN EL SERVIDOR:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
//crear tienda 
app.post('/api/store', async (req, res) => {
    try {
        const { name, email } = req.body;
        const store = await prisma.store.create({ data: { name, email } });
        res.status(201).json(store);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});
//crear tarifa de envio
app.post('/api/shippingrate', async (req, res) => {
    try {
        const { region, commune, baseCost } = req.body;
        const shippingRate = await prisma.shippingRate.create({ data: { region, commune, baseCost } });
        res.status(201).json(shippingRate);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});
// Crear orden
app.post('/api/order', async (req, res) => {
    try {
        const { storeId, recipientName, recipientAddress, destinationCommune, totalCost, trackingCode } = req.body;
        const order = await prisma.order.create({
            data: {
                storeId,
                recipientName,
                recipientAddress,
                destinationCommune,
                totalCost,
                trackingCode
            }
        });
        res.status(201).json(order);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});
// probar la logistida de la api mediante thunder
app.get('/', (req, res) => {
    res.json({ message: 'API de logística funcionando correctamente' });
});
app.patch('/api/orders/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Ej: "En Tránsito", "Entregado"
        const updatedOrder = await prisma.order.update({
            where: { id },
            data: { status },
        });
        return res.json({
            message: 'Estado del pedido actualizado exitosamente',
            order: updatedOrder,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No se pudo actualizar el estado del pedido' });
    }
});
// 2. Consultar estado del paquete por código de seguimiento
app.get("/api/orders/:trackingCode", async (req, res) => {
    try {
        const { trackingCode } = req.params;
        const order = await prisma.order.findUnique({
            where: { trackingCode },
            include: { store: true },
        });
        if (!order) {
            return res
                .status(404)
                .json({ error: "Pedido no encontrado con ese código de seguimiento" });
        }
        return res.json(order);
    }
    catch (error) {
        return res.status(500).json({ error: "Error interno del servidor" });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
// 3. Generar etiqueta de despacho en PDF descargable
app.get('/api/orders/:id/label', async (req, res) => {
    try {
        const { id } = req.params;
        const order = await prisma.order.findUnique({
            where: { id },
            include: { store: true },
        });
        if (!order) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        // Crear un documento PDF con formato de etiqueta (ancho 400, alto 550)
        const doc = new pdfkit_1.default({ size: [400, 550], margin: 25 });
        // Configurar la respuesta HTTP para que devuelva un PDF descargable
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=etiqueta-${order.trackingCode}.pdf`);
        // Conectar el flujo del PDF con la respuesta del servidor
        doc.pipe(res);
        // --- DISEÑO DE LA ETIQUETA ---
        // Cabecera
        doc.fontSize(14).font('Helvetica-Bold').text('CHILE LOGISTICS - DESPACHO', { align: 'center' });
        doc.fontSize(9).font('Helvetica').text('Sistema de Envíos Nacionales', { align: 'center' });
        doc.moveDown();
        // Código de seguimiento destacado
        doc.fontSize(10).text('CÓDIGO DE SEGUIMIENTO:');
        doc.fontSize(16).font('Helvetica-Bold').text(order.trackingCode);
        doc.moveDown(0.5);
        // Información de la tienda origen
        doc.fontSize(9).font('Helvetica').text(`Tienda Remitente: ${order.store.name}`);
        doc.text(`Contacto: ${order.store.email}`);
        doc.moveDown();
        // Caja para los datos del destinatario
        const startY = doc.y;
        doc.rect(25, startY, 350, 110).stroke();
        doc.fontSize(10).font('Helvetica-Bold').text('DATOS DEL DESTINATARIO:', 35, startY + 10);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Nombre: ${order.recipientName}`, 35, startY + 30);
        doc.text(`Dirección: ${order.recipientAddress}`, 35, startY + 50, { width: 330 });
        doc.text(`Comuna de Destino: ${order.destinationCommune}`, 35, startY + 85);
        doc.moveDown(5);
        // Costo y Estado
        doc.fontSize(10).font('Helvetica-Bold').text(`Estado Actual: ${order.status}`);
        doc.fontSize(12).font('Helvetica-Bold').text(`Total a Pagar: $${order.totalCost} CLP`, { align: 'right' });
        // Pie de página de la etiqueta
        doc.moveDown(2);
        doc.fontSize(8).font('Helvetica-Oblique').text('Documento generado automáticamente por Chile Logistics MVP.', { align: 'center' });
        // Finalizar documento
        doc.end();
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al generar la etiqueta PDF' });
    }
});
// Obtener todas las tiendas
app.get('/api/stores', async (req, res) => {
    try {
        const stores = await prisma.store.findMany();
        res.json(stores);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las tiendas' });
    }
});
// Obtener todas las tarifas de envío
app.get('/api/shippingrates', async (req, res) => {
    try {
        const rates = await prisma.shippingRate.findMany();
        res.json(rates);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});
// Obtener todas las órdenes (incluyendo los datos de su tienda asociada)
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            include: { store: true }
        });
        res.json(orders);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});
