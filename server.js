require('./config/config');

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');

var {mongoose} = require('./db/mongoose');
var {Engagement} = require('./models/engagement');
var {User} = require('./models/user');
var {Vendor} = require('./models/vendor');
var {authenticate} = require('./middleware/authenticate');

var app = express();
const port = process.env.PORT;

app.use(bodyParser.json());

app.post('/engagements', authenticate, (req, res) => {
  var engagement = new Engagement({
    engagementId: req.body.engagementId,
    scopeDescription: req.body.scoeDescription,
    riskRating: req.body.riskRating,
    lastAssessedOn: req.body.lastAssessedOn,
    dueOn: req.body.dueOn,
    _burm: req.body._burm,
    _sr: req.body._sr,
    _tpm: req.body._tpm,
    _vspoc: req.body._vspoc,
  });

  engagement.save().then((doc) => {
    res.send(doc);
  }, (e) => {
    res.status(400).send(e);
  });
});

// app.get('/engagements', authenticate, (req, res) => {
//   Todo.find({
//     _creator: req.user._id
//   }).then((todos) => {
//     res.send({todos});
//   }, (e) => {
//     res.status(400).send(e);
//   });
// });

app.get('/engagements/:id', authenticate, (req, res) => {
  var id = req.params.id;

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  Engagement.findOne({
    $and: [ {engagementId: id},
            {$or: [{role: { $in: ['admin','assessor','auditor']}},{_vspoc: req.user._id}]}
    ]
  }).then((engagement) => {
    if (!engagement) {
      return res.status(404).send();
    }

    res.send({engagement});
  }).catch((e) => {
    res.status(400).send();
  });
});

app.delete('/engagements/:id', authenticate, (req, res) => {
  var id = req.params.id;

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  Engagement.findOneAndRemove({
    $and: [ {engagementId: id},
      {role: { $eq: 'admin'}}
    ]
  }).then((engagement) => {
    if (!engagement) {
      return res.status(404).send();
    }

    res.send({engagement});
  }).catch((e) => {
    res.status(400).send();
  });
});

app.patch('/engagements/:id', authenticate, (req, res) => {
  var id = req.params.id;
  var body = _.pick(req.body, ['engagementId', 'scopeDescription','riskRating','lastAssessedOn','dueOn','_burm','_sr','_tpm','_vspoc']);

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  // if (_.isBoolean(body.completed) && body.completed) {
  //   body.completedAt = new Date().getTime();
  // } else {
  //   body.completed = false;
  //   body.completedAt = null;
  // }

  Engagement.findOneAndUpdate({_id: id}, {$set: body}, {new: true}).then((engagement) => {
    if (!engagement) {
      return res.status(404).send();
    }

    res.send({engagement});
  }).catch((e) => {
    res.status(400).send();
  })
});

// POST /users
app.post('/users', (req, res) => {
  var body = _.pick(req.body, ['email', 'password','fName','mName','lName','workPhone','mobilePhone']);
  var user = new User(body);

  user.save().then(() => {
    return user.generateAuthToken();
  }).then((token) => {
    res.header('x-auth', token).send(user);
  }).catch((e) => {
    res.status(400).send(e);
  })
});

app.get('/users/me', authenticate, (req, res) => {
  res.send(req.user);
});

app.post('/users/login', (req, res) => {
  var body = _.pick(req.body, ['email', 'password']);

  User.findByCredentials(body.email, body.password).then((user) => {
    return user.generateAuthToken().then((token) => {
      res.header('x-auth', token).send(user);
    });
  }).catch((e) => {
    res.status(400).send();
  });
});

app.delete('/users/me/token', authenticate, (req, res) => {
  req.user.removeToken(req.token).then(() => {
    res.status(200).send();
  }, () => {
    res.status(400).send();
  });
});

app.listen(port, () => {
  console.log(`Started up at port ${port}`);
});

module.exports = {app};
