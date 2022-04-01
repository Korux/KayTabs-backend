const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;

require('dotenv').config();

const cors = require('cors');

app.use(cors());
app.use(express.json());

var db;
var tabs;
var users;

MongoClient.connect(process.env.DBSTR, {useUnifiedTopology : true}, (err, client) => {
    if (err) return console.error(err);
    console.log('Connected to Database');
    db = client.db('ktabs-db');
    tabs = db.collection('tabs');
    users = db.collection('users');
});

app.post('/users', (req,res) => {

    users.find( {email : req.body.email }).toArray()
    .then(results => {
        if(results.length == 0) {
            users.insertOne(req.body)
            .then(result => {
                res.status(201).send({"id" : result.insertedId});
            })
            .catch(err => {
                console.error(err);
                res.status(400).send({"Error" : "Unknown Error, try again later"});
            });
        }
        else res.status(403).send({"Error" : "The email is already in use"});
    })
    .catch(err => {
        console.error(err);
        res.status(400).send({"Error" : "Unknown Error, try again later"});
    });
});

app.get('/users', (req,res) => {

    let em = req.query.email;

    if(em != null){
        users.find( {email : em}).toArray()
        .then(results => {
            if(results.length == 0) res.status(404).send({"Error" : "This user does not exist"});
            else res.status(200).send(results[0]);
        })
        .catch(err => {
            console.error(err);
            res.status(400).send({"Error" : "Unknown Error, try again later"});
        });
    }else{
        users.find().toArray()
        .then(results => {
            res.status(200).send(results);
        })
        .catch(err => {
            console.error(err);
            res.status(400).send({"Error" : "Unknown Error, try again later"});
        });
    }
});

app.get('/users/:id', (req,res) => {

    if(!ObjectId.isValid(req.params.id)){
        res.status(404).send({"Error" : "This ID does not exist"});
    }else{
        users.findOne(ObjectId(req.params.id))
        .then(results => {
            if(!results) res.status(404).send({"Error" : "This ID does not exist"});
            else res.status(200).send(results);
        })
        .catch(err => {
            console.error(err);
            res.status(400).send({"Error" : "Unknown Error, try again later"});
        });
    }
});

app.get('/users/:id/:tabtype', (req,res) => {
    if(req.params.tabtype !== 'tabs' && req.params.tabtype !== 'starred') res.status(400).send({"Error" : "Please specify the tab type (tabs or starred)"});
    if(!ObjectId.isValid(req.params.id)){
        res.status(404).send({"Error" : "This ID does not exist"});
    }else{
        users.findOne(ObjectId(req.params.id))
        .then(results => {
            if(!results) res.status(404).send({"Error" : "This ID does not exist"});
            else{
                let tablist = req.params.tabtype === "tabs" ? results.tabs : results.starred;
                tabs.find({ _id : { $in : tablist } }).toArray()
                .then(results => {
                    res.status(200).send(results);
                })
                .catch(err => {
                    console.error(err);
                    res.status(400).send({"Error" : "Unknown Error, try again later"});
                });
            }
        })
        .catch(err => {
            console.error(err);
            res.status(400).send({"Error" : "Unknown Error, try again later"});
        });
    }
});

//incomplete
app.patch('/users/:id', (req,res) => {

    if(!ObjectId.isValid(req.params.id)){
        res.status(404).send({"Error" : "This ID does not exist"});
    }else{
        users.find(ObjectId(req.params.id)).toArray()
        .then(results => {
            if(results.length == 0) res.status(404).send({"Error" : "This ID does not exist"});
            else{
                // do patch here
                res.status(200).send(results);
            }
        })
        .catch(err => {
            console.error(err);
            res.status(400).send({"Error" : "Unknown Error, try again later"});
        });
    }
});

app.post('/tabs', (req,res) => {
    tabs.insertOne(req.body)
    .then(result => {
        res.status(201).send({"id" : result.insertedId});
    })
    .catch(err => {
        console.error(err);
        res.status(400).send({"Error" : "Unknown Error, try again later"});
    });
});

app.get('/tabs', (req,res) => {

    let search = req.query.search;

    if(search != null){
        tabs.find({ $or: [ { title: {$regex : search} }, { ownername: {$regex : search} } ] }).toArray()
        .then(results => {
            res.status(200).send(results);
        })
        .catch(err => {
            console.error(err);
            res.status(400).send({"Error" : "Unknown Error, try again later"});
        });

    }
    else{
        tabs.find().toArray()
        .then(results => {
            res.status(200).send(results);
        })
        .catch(err => {
            console.error(err);
            res.status(400).send({"Error" : "Unknown Error, try again later"});
        });
    }
});

app.get('/tabs/:id', (req,res) => {
    if(!ObjectId.isValid(req.params.id)){
        res.status(404).send({"Error" : "This tab does not exist"});
    }else{
        tabs.findOne(ObjectId(req.params.id))
        .then(results => {
            if(!results) res.status(404).send({"Error" : "This tab does not exist"});
            else res.status(200).send(results);
        })
        .catch(err => {
            console.error(err);
            res.status(400).send({"Error" : "Unknown Error, try again later"});
        });
    }
});

app.delete('/tabs/:id', (req,res) => {
    
});


app.put('/users/:userid/tabs/:tabid', (req,res) => {

    if(!ObjectId.isValid(req.params.userid) || !ObjectId.isValid(req.params.tabid)){
        res.status(404).send({"Error" : "Tab or User ID does not exist"});
    }else{
        let userQuery = users.findOne(ObjectId(req.params.userid));
        let tabQuery = tabs.findOne(ObjectId(req.params.tabid));

        Promise.all([userQuery, tabQuery])
        .then(([user,tab]) => {
            if(!user || !tab) res.status(404).send({"Error" : "Tab or User ID does not exist"});
            else{
                if(req.body.type === "star"){
                    let newStar = user.starred;
                    newStar.push(tab._id);
                    users.updateOne({_id : ObjectId(req.params.userid)}, {$set:{"starred" : newStar}})
                    .then(() => {
                        res.status(200).send(user);
                    })
                    .catch(err => {
                        console.error(err);
                        res.status(400).send({"Error" : "Unknown Error, try again later"});
                    });
                }else if(req.body.type === "tab"){
                    let newTab = user.tabs;
                    newTab.push(tab._id);
                    users.updateOne({_id : ObjectId(req.params.userid)}, {$set:{"tabs" : newTab}})
                    .then(() => {
                        res.status(200).send(user);
                    })
                    .catch(err => {
                        console.error(err);
                        res.status(400).send({"Error" : "Unknown Error, try again later"});
                    });
                }else{
                    res.status(400).send({"Error" : "Must specify how the tab should be linked"});
                }
            }
        })
        .catch(err => {
            console.error(err);
            res.status(400).send({"Error" : "Unknown Error, try again later"});
        });
    }
});

app.delete('/users/:userid/tabs/:tabid', (req,res) => {

    if(!ObjectId.isValid(req.params.userid) || !ObjectId.isValid(req.params.tabid)){
        res.status(404).send({"Error" : "Tab or User ID does not exist"});
    }else{
        let userQuery = users.findOne(ObjectId(req.params.userid));
        let tabQuery = tabs.findOne(ObjectId(req.params.tabid));

        Promise.all([userQuery, tabQuery])
        .then(([user,tab]) => {
            if(!user || !tab) res.status(404).send({"Error" : "Tab or User ID does not exist"});
            else{
                if(req.body.type === "star"){
                    let newStar = user.starred;
                    newStar = newStar.filter(val => !val.equals(tab._id));
                    users.updateOne({_id : ObjectId(req.params.userid)}, {$set:{"starred" : newStar}})
                    .then(() => {
                        res.status(200).send(user);
                    })
                    .catch(err => {
                        console.error(err);
                        res.status(400).send({"Error" : "Unknown Error, try again later"});
                    });
                }else if(req.body.type === "tab"){
                    let newTab = user.tabs;
                    newTab = newTab.filter(val => val !== tab._id);
                    users.updateOne({_id : ObjectId(req.params.userid)}, {$set:{"tabs" : newTab}})
                    .then(() => {
                        res.status(200).send(user);
                    })
                    .catch(err => {
                        console.error(err);
                        res.status(400).send({"Error" : "Unknown Error, try again later"});
                    });
                }else{
                    res.status(400).send({"Error" : "Must specify how the tab should be linked"});
                }
            }
        })
        .catch(err => {
            console.error(err);
            res.status(400).send({"Error" : "Unknown Error, try again later"});
        });
    }
});

app.get('/', (req, res) => {
    res.status(200)
    .send("KTabs API")
    .end();
});

app.listen(PORT, () => {
    console.log(`Listening at http://localhost:${PORT}`);
});