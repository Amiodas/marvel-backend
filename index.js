const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

// middleware
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yzibn5s.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = (req, res, next) => {
  console.log("verify jwt");
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, errorMessage: "Unauthorize Access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(403)
        .send({ error: true, errorMessage: "Unauthorized Access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //collection
    const toyCollection = client.db("toysMarketPlaceDB").collection("toys");
    const myToysCollection = client
      .db("toysMarketPlaceDB")
      .collection("myToys");

    //jwt
    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "24h",
      });
      res.send({ token });
    });

    app.get("/toys", async (req, res) => {
      const toys = toyCollection.find();
      const result = await toys.toArray();
      res.send(result);
    });

    app.get("/toys/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await toyCollection.findOne(query);
      res.send(result);
    });

    app.put("/toys/:id", async (req, res) => {
      const id = req.params.id;
      const updatedToy = req.body;

      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          seller: updatedToy.seller,
          seller_email: updatedToy.seller_email,
          name: updatedToy.name,
          picture: updatedToy.picture,
          price: updatedToy.price,
          category: updatedToy.category,
          subcategory: updatedToy.subcategory,
          rating: updatedToy.rating,
          quantity: updatedToy.quantity,
          description: updatedToy.description,
        },
      };
      const result = await toyCollection.updateOne(filter, updatedDoc, options);
      res.send(result);
    });

    app.post("/addAToy", async (req, res) => {
      const addedToy = req.body;
      console.log(addedToy);
      console.log(addedToy.seller_email);
      const result = await toyCollection.insertOne(addedToy);
      res.send(result);
    });

    app.get("/toyCategory", async (req, res) => {
      const uniqueCategories = [];
      const seenCategories = new Set();
      const toys = toyCollection.find();
      const result = await toys.toArray();
      const categories = result.map((obj) => {
        const category = obj.category;
        if (!seenCategories.has(category)) {
          uniqueCategories.push(category);
          seenCategories.add(category);
        }
      });
      res.send(uniqueCategories);
    });

    app.get("/totalToy", async (req, res) => {
      const result = await toyCollection.estimatedDocumentCount();
      res.send({ totalToy: result });
    });

    app.get("/matchedToy", async (req, res) => {
      const page = parseInt(req.query.page) || 0;
      const limit = parseInt(req.query.limit) || 5;
      const skip = page * limit;
      const result = await toyCollection
        .find()
        .skip(skip)
        .limit(limit)
        .toArray();
      res.send(result);
    });

    app.post("/myToys", async (req, res) => {
      const addedToy = req.body;
      console.log(addedToy);
      const result = await myToysCollection.insertOne(addedToy);
      res.send(result);
    });

    app.get("/myToys", verifyJWT, async (req, res) => {
      const decoded = req.decoded;
      if (decoded.email !== req.query.email) {
        return res.status(403).send({ error: 1, message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = { seller_email: req.query.email };
      }
      const result = await toyCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/myToys/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: id };
      const result = await myToysCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Assignment 11 server");
});

app.listen(port, () => {
  console.log(`Server running on: ${port}`);
});
