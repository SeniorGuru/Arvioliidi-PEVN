const sgMail = require("@sendgrid/mail")
// const nodemailer = require('nodemailer')

const { Property, Query, Customui, Sequelize, User } = require("../models")

const op = Sequelize.Op

exports.getValue = async (req, res) => {
  try {
    const query = req.body

    let sqm = parseInt(req.body.sqm)
    const builtYear = parseInt(req.body.builtYear)
    var gtSqm, ltSqm, gteYear, lteYear
    // var wSqm = Math.floor(sqm / 10)
    // var wYear = Math.floor(builtYear / 10)
    if (sqm - 90 < 30 && sqm - 90 > 0 ) {
      gtSqm = 90
      ltSqm = sqm + 30
    } else if (sqm - 90 > 30) {
      gtSqm = sqm - 30
      ltSqm = sqm + 30
    } else {
      gtSqm = sqm - 10
      ltSqm = sqm + 10
    }
    gteYear = builtYear - 10
    lteYear = builtYear + 10
    // if (sqm % 10 >= 5) {
    //   if (wSqm * 10 - 10 < 0) {
    //     gtSqm = 0
    //     ltSqm = 20
    //   } else {
    //     gtSqm = wSqm * 10
    //     ltSqm = wSqm * 10 + 20
    //   }
    // } else {
    //   if (wSqm * 10 - 10 < 0) {
    //     gtSqm = 0
    //     ltSqm = 10
    //   } else {
    //     gtSqm = wSqm * 10 - 10
    //     ltSqm = wSqm * 10 + 10
    //   }
    // }
    // if (builtYear % 10 >= 5) {
    //     if (wYear * 10 - 10 < 0) {
    //       gtYear = 0
    //       ltYear = 20
    //     } else {
    //       gtYear = wYear * 10
    //       ltYear = wYear * 10 + 20
    //     }
    //   } else {
    //     if (wYear * 10 - 10 < 0) {
    //       gtYear = 0
    //       ltYear = 10
    //     } else {
    //       gtYear = wYear * 10 - 10
    //       ltYear = wYear * 10 + 10
    //     }
    //   }

    // if (builtYear < 1960) {
    //   property = {
    //     street: req.body.street,
    //     buildingType: req.body.buildingType,
    //     sqm: { [op.gte]: gtSqm, [op.lte]: ltSqm },
    //     condition: req.body.condition,
    //     builtYear: { [op.lte]: 1960 },
    //     plot: req.body.plot,
    //     zip: req.body.zip,
    //     city: req.body.city,
    //     roomNumber: req.body.roomNumber,
    //   }
    // } else {

    // }

    var property, min, max, length, data, month
    async function calculate() {
      data = await Property.findAll({ where: property })
      length = await Property.count({ where: property })
      console.log(property)
    }
    const save = async (step) => {
      //get properties sold last few months
      const months = [6, 12, 24, 36]
      for (let i = 0; i < months.length; i++) {
        const startDate = new Date()
        const endDate = new Date()
        startDate.setMonth(startDate.getMonth() - months[i])
        // const startDate = today.setMonth(today.getMonth() - months[i])
        property.saleDate = { [op.gte]: startDate, [op.lte]: endDate }
        await calculate()
        month = months[i]
        if (length > 3) {
          break
        }
      }

      //get the highest and lowest value that sold with the same address

      let soldmax = await Property.max("price", {
        where: {
          city: req.body.city,
          street: req.body.street,
          zip: req.body.zip,
          sqm: { [op.gte]: sqm - 10, [op.lte]: sqm + 10 },
        },
      })

      let soldmin = await Property.min("price", {
        where: {
          city: req.body.city,
          street: req.body.street,
          zip: req.body.zip,
          sqm: { [op.gte]: sqm - 10, [op.lte]: sqm + 10 },
        },
      })

      var priceSum = timeSum = sqmSum = 0
      data.map((field, index) => {
        priceSum += field.price
        timeSum += field.transactionTime
        sqmSum += field.sqm
      })
      // console.log(step, priceSum, "-", timeSum, length, data, "aaaaaaa")
      min = Math.floor((priceSum / length) * 0.9)
      max = Math.floor((priceSum / length) * 1.1)
      // console.log(data)
      if (priceSum === 0) {
        query.price = "null"
        query.valuation = "null"
      } else {
        query.price = Math.floor(priceSum / length)
        query.valuation = Math.floor(priceSum / length)
      }
      await Query.create(query)
      if (step !== "null")
        return res.json({
          value: Math.floor(priceSum / length),
          properties: data,
          min: min,
          max: max,
          month: month,
          soldmax: soldmax,
          soldmin: soldmin,
          time: Math.floor(timeSum / length),
          avSqm: Math.floor(sqmSum / length),
          status: step,
          query: property
        })
    }

    //first step
    property = {
      buildingType: req.body.buildingType,
      roomNumber: req.body.roomNumber,
      builtYear: { [op.gte]: gteYear, [op.lte]: lteYear },
      zip: req.body.zip,
      sqm: { [op.gte]: gtSqm, [op.lte]: ltSqm}
    }
    if (sqm >= 90)
    property.roomNumber = {[op.gte]: 1, [op.lte]: 20}
    if (req.body.condition === "Hyvä" || req.body.condition === "Erinomainen") {
      property.condition = {
        [op.or]: ["Hyvä", "Erinomainen"],
      }
    } else {
      property.condition = req.body.condition
    }

    await calculate()
    // console.log(length, '++++++')
    if (length !== 0) {
      console.log(length, "01")
      await save("Hyvä")
    } else {
      //sencond step
      property.roomNumber = { [op.gte]: 1, [op.lte]: 20 }
      await calculate()
      console.log(length, "02")

      if (length !== 0) {
        await save("Hyvä")
      } else {
        //last step
        // gtSqm = parseInt(sqm) - 15
        // leSqm = parseInt(sqm) + 15
        // property.roomNumber = { [op.gte]: 1, [op.lte]: 20 }
        // await calculate()
        // console.log(length, "03")

        // if (length !== 0) {
        //   await save("Kohtalainen")
        // } else {
          await save("null")
          return res.status(400).json({
            message: "not found matched data!",
            query: property,
          })
        // }
      }
    }
    //send mail
    if (req.body.email) {
      sgMail.setApiKey(
        "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"
      )
      const msg = {
        // to: "vladislav.ivanilov2019@gmail.com",
        to: req.body.toCompany,
        from: `mikael@mikaeldacosta.com`,
        subject: "I want a property that meets the conditions below.",
        text: "and easy to do anywhere, even with Node.js",
        replyTo: `${req.body.email}`,
        html: `
            <h1>I want a property that meets the conditions below.</h1>
            <h3><strong>Street: </strong>${req.body.street}</h3>
            <h3><strong>Building Type: </strong>${req.body.buildingType}</h3>
            <h3><strong>Built Year: </strong>${req.body.builtYear}</h3>
            <h3><strong>Sqm: </strong>${req.body.sqm}</h3>
            <h3><strong>Condition: </strong>${req.body.condition}</h3>
            <h3><strong>Plot: </strong>${req.body.plot}</h3>
            <h3><strong>Zip: </strong>${req.body.zip}</h3>
            <h3><strong>City: </strong>${req.body.city}</h3>
            <h3><strong>Room Number: </strong>${req.body.roomNumber}</h3>
            <br/>
            <h2>My contact Info</h2>
            <h3><strong>Name: </strong>${
              req.body.name ? req.body.name : ""
            }</h3>
            <h3><strong>Email-address: </strong>${req.body.email}</h3>
            <h3><strong>Phone Number: </strong>${
              req.body.phone ? req.body.phone : ""
            }</h3>
            `,
      }
      await sgMail.send(msg)
    }
  } catch (err) {
    console.log(err, "0000000000000000")
    return res.status(400).json({
      message: err,
    })
  }
}

exports.getCustomUi = async (req, res) => {
  const { company } = req.body
  const ui = await Customui.findOne({
    where: { user: company },
  })
  res.json({
    ui,
  })
}

exports.getPopUpText = async (req, res) => {
  const { identify } = req.params
  try {
    const data = await Customui.findOne({
      attributes: ["popupText", "popupCol"],
      include: [
        {
          model: User,
          as: "users",
          where: { identify: identify },
        },
      ],
    })
    console.log(data, "------------")
    res.json({
      success: true,
      data,
    })
  } catch (err) {
    console.log(err)
    res.status(400).json({
      success: false,
      error: err,
    })
  }
  // const ui = await Customui.findOne({
  //   where: { user: company },
  // });
  // res.status(200).json({
  //   ui,
  // });
}
