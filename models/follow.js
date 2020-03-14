module.exports = (sequelize, DataTypes)=>(
    sequelize.define('follow',{
        followerId :{
            type : DataTypes.STRING(30),
            allowNull : false,
            defaultValue : 0,
            primaryKey: true
        },
        followingId :{
            type : DataTypes.STRING(30),
            allowNull : false,
            defaultValue : 0,
            primaryKey: true
        },
        like_num : {
            type : DataTypes.INTEGER,
            allowNull : false,
            defaultValue : 0,
        },

        comment_num : {
            type : DataTypes.INTEGER,
            allowNull : false,
            defaultValue : 0,
        },


        status : {
            type : DataTypes.TINYINT(1),
            allowNull : false,
            defaultValue : 1,
        },
    
    },
    
        {
            paranoid : true,
            primaryKey : true,
        }

    
    )

);