var express = require('express');
var router = express.Router();

var errorMessage = require('../common/error/error-message');

var mysqlPool = require('../common/database/mysql');
mysqlPool.generatePool();

const redis = require('redis');
const client = redis.createClient();

const queryLimit = 1;
const distance = 10;
const progress_status = 'PROGRESS';

router.get('/', (req, res) => {

  const { long, lat, userId } = req.query;
  
  client.get(userId, (err, reply) => {
    if (err) {
      return res.status(500).send(errorMessage.UNKOWN_ERROR);
    }
    else {
      var requestHistories = reply === null ? [] : JSON.parse(reply);

      const query = `
      SELECT 
        r.id AS requestId,
        bl.address AS beginAddress,
        bg.latitude AS beginLatitude,
        bg.longitude AS beginLongitude, 
        
        fl.address AS finishAddress,
        fg.latitude AS finishLatitude,
        fg.longitude AS finishLongitude,
        
        stuff.name AS stuffName,
        stuff.size AS stuffSize,
        stuff.weight AS stuffWeight,
        stuff.stuff_code AS stuffCode,
        
        (6371*acos(cos(radians(?))*cos(radians(bg.latitude))*cos(radians(bg.longitude)
        -radians(?))+sin(radians(?))*sin(radians(bg.latitude)))) AS distance,

        r.begin_time AS beginTime,  
        r.finish_time AS finishTime,

        sender.name AS senderName,
        sender.phone AS senderPhone,
        sender.email AS senderEmail,
        sender.birthday AS senderBirthday,
        sender.provider_selfi_url AS senderSelfiURL,

        reciever.phone As recieverPhone


        
      FROM dv_request r
        JOIN dv_location bl
        ON bl.id = r.begin_location_id
          JOIN dv_gps bg
          ON bg.id = bl.gps_id
          
        JOIN dv_location fl
          ON fl.id = r.finish_location_id
            JOIN dv_gps fg
            ON fg.id = fl.gps_id
          
        JOIN dv_stuff stuff
          ON stuff.id = r.stuff_id

        JOIN dv_user sender
        ON sender.id = r.sender_id

        JOIN dv_reciever reciever
        ON reciever.id = r.reciever_id

        where r.id not in (?)
        and r.status = ?
        having distance <= ?
        order by distance asc
        limit ?
        `;
      const parameters = [lat, long, lat, queryParameterArray(requestHistories), progress_status, distance, queryLimit];

      mysqlPool.query(query, parameters) 
        .then(rows => {
          if (rows.length == 0) {
            return res.status(404).send(errorMessage.NO_MATCHED_REQUEST);
          }
          else {
            requestHistories.push(rows[0].requestId);
            client.set(userId, JSON.stringify(requestHistories));
            res.status(200).json(rows[0]);
          }
        })
        .catch(err => {
          console.error(err);
          return res.status(500).send(errorMessage.UNKOWN_ERROR);
        });
    }
  }); 
});

router.get('/flush', (req, res) => {
  var { delivererId } = req.query;
  client.del(delivererId);
  res.status(200).send('flushed');
});

function queryParameterArray(arr) {
  return arr.length == 0 ? [-1] : arr;
}


module.exports = router;