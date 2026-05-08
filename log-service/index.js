import amqp from 'amqplib';

async function receiveLog() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        const queue = 'laporan_queue';

        await channel.assertQueue(queue, { durable: true });
        
        console.log(" [*] Menunggu pesan di %s. Untuk keluar tekan CTRL+C", queue);

        channel.consume(queue, (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                console.log(" [LOG] Menerima Laporan Baru:");
                console.log(` ID: ${data.id} | NIM: ${data.nim} | Isi: ${data.isi}`);
                
                channel.ack(msg); // infoin RabbitMQ pesan sukses diproses
            }
        });
    } catch (error) {
        console.error("Log Service Error:", error);
    }
}
receiveLog();