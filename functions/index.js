const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

var serviceAccount = require("./permissions.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://flowlity-4b6c5.firebaseio.com"
});
const db = admin.firestore();

app.post('/api/create', (req, res) => {
  (async () => {
    const { product_id, product_name, date, inventory_level } = req.body
    try {
      await db.collection('products').doc(product_id).set({
        product_name
      });
      await db
        .collection('products').doc(product_id)
        .collection('data').doc(date)
        .set({
          inventory_level
        })
      return res.status(200).send();
    }
    catch(err) {
      console.log(err);
      return res.status(500).send(err);
    }
  })();
});

app.get('/api/read/:product_id', async(req, res) => {
  const { product_id } = req.params
  try {
    const query = db.collection('products').doc(product_id);
    let item = await query.get();
    let response = item.data();
    response.product_id = item.id;
    response.data = new Object();
    const subcollection = query.collection('data')
    await subcollection.get()
      .then(snapshot => {
        snapshot.forEach(doc => {
          const { id } = doc;
          const { inventory_level } = doc.data();
          response.data[id] = parseInt(inventory_level);
        });
        return null;
      })
      .catch(err => {
        console.log('Error getting documents', err);
      });
    return res.status(200).send(response);
  }
  catch(err) {
    console.log(err);
    return res.status(500).send(err);
  }
})

app.get('/api/read', async(req, res) => {
  try {
    let query = db.collection('products');
    let response = [];
    let snapshot = await query.get()
    for (doc of snapshot.docs) {
      let selectedItem = {
        product_id: doc.id,
        product_name: doc.data().product_name
      };
      selectedItem.data = [];
      const subcollection = query.doc(doc.id).collection('data');
      // eslint-disable-next-line
      let subsnapshot = await subcollection.get()
      for (subdoc of subsnapshot.docs) {
        const { id } = subdoc;
        const { inventory_level } = subdoc.data();
        const obj = {
          date: id,
          inventory_level: inventory_level
        }
        selectedItem.data.push(obj)
      }
      response.push(selectedItem);
    }
    return res.status(200).send(response);
  }
  catch(err) {
    console.log(err);
    return res.status(500).send(err);
  }
})

exports.app = functions.https.onRequest(app);
