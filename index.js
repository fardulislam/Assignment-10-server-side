const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const serviceAccount = require("./servicekey.json");
const app = express();
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 3000;

// middleware //
app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ojtrbst.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyfirebasetoken  = async (req, res, next) => {

  console.log('authorization',req.headers.authorization)
  if(!req.headers.authorization){
    return res.status(401).send({message:'unauthorize access'})
  }
  const token = req.headers.authorization.split(' ')[1]
  if(!token){
    return res.status(401).send({message : 'unauthorize token'})
  }
  try{
    const userinfo = await admin.auth().verifyIdToken(token)
    req.token_email = userinfo.email;

    console.log( 'after data comming',userinfo)
    next()
  }
  catch{
    return res.status(401).send({message : 'unauthorize token'})
  }
 
  
};

async function run() {
  try {
    await client.connect();
    const db = client.db("carmodeldb");
    const carcollections = db.collection("car-collection");
    // get//
    app.get("/car-collection", async (req, res) => {
      const result = await carcollections.find().toArray();
      res.send(result);
    });
    app.get(`/car-collection/:id`,  async (req, res) => {
      const id = req.params.id;
      const quary = { _id: new ObjectId(id) };
      const result = await carcollections.findOne(quary);

      res.send(result);
    });
    // create//
    app.post("/car-collection", async (req, res) => {
      const data = req.body;
      const result = await carcollections.insertOne(data);
      res.send({
        success: true,
        result,
      });
    });
    // update //
    app.put("/car-collection/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const quary = { _id: new ObjectId(id) };
      const updateDoc = { $set: updatedData };
      const result = await carcollections.updateOne(quary, updateDoc);

      res.send(result);
    });

    // delete //
    app.delete("/car-collection/:id", async (req, res) => {
      const id = req.params.id;
      const quary = { _id: new ObjectId(id) };
      const result = await carcollections.deleteOne(quary);
      res.send(result);
    });

    // newest data //

    app.get("/newest-car", async (req, res) => {
      const result = await carcollections
        .find()
        .sort({ createdAt: "desc" })
        .limit(6)
        .toArray();
      res.send(result);
    });
    // my data //

    app.get("/car",verifyfirebasetoken, async (req, res) => {
      // console.log('headers',req.headers)
      try {
        const email = req.query.email;
        const query = {};

        if (email) {
          if(email !== req.token_email){
            return res.status(403).send({message:'forbiden access'})
          }
          query.providerEmail = email;
        }

        const result = await carcollections.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server Error" });
      }
    });

    // delete //
    app.delete("/car/:id", async (req, res) => {
      const id = req.params.id;
      const quary = { _id: new ObjectId(id) };
      const result = await carcollections.deleteOne(quary);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
