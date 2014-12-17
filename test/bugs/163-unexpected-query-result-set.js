describe.only("Bug #163: Unexpected query result set ", function () {
  var rid;
  before(function () {
    return CREATE_TEST_DB(this, 'testdb_bug_163')
    .bind(this)
    .then(function () {
      return this.db.class.create('User','V');
    })
    .then(function (userClass) {
      return userClass.property.create({
        name: 'firstname',
        type: 'String'
      });
    })
    .then(function () {
      return this.db.class.create('ProfilePicture','V');
    })
    .then(function () {
      return this.db.class.create('PictureFile','V');
    })
    .then(function (pictureFileClass) {
      return pictureFileClass.property.create({
        name: 'format',
        type: 'Integer'
      }).then(function(){
        return pictureFileClass.property.create({
          name: 'url',
          type: 'String'
        });
      });
    })
    .then(function () {
      return this.db.class.create('HAS_PROFILE_PICTURE','E');
    })
    .then(function () {
      return this.db.class.create('HAS_FILE','E');
    })
    .then(function () {
      return this.db.vertex.create({
        '@class': 'User',
        firstname: 'Marcel'
      })
    })
    .then(function (userVertex) {

      rid = userVertex['@rid'];

      return this.db.vertex.create({
        '@class': 'ProfilePicture'
      })
    })
    .then(function () {
      return this.db.vertex.create({
        '@class': 'PictureFile',
        format: 1,
        url: 'my-first-url.ext'
      })
    })
    .then(function () {
      return this.db.vertex.create({
        '@class': 'PictureFile',
        format: 2,
        url: 'my-second-url.ext'
      })
    })
    .then(function () {
      return this.db.vertex.create({
        '@class': 'PictureFile',
        format: 3,
        url: 'my-third-url.ext'
      })
    })
    .then(function () {
      return this.db.edge.from("SELECT FROM User").to("SELECT FROM ProfilePicture").create('HAS_PROFILE_PICTURE');
    })
    .then(function () {
      return this.db.edge.from("SELECT FROM ProfilePicture").to("SELECT FROM PictureFile").create('HAS_FILE');
    });
  });
  after(function () {
    return DELETE_TEST_DB('testdb_bug_163');
  });

  it('should fetch picture files', function () {
    return this.db.exec("SELECT $Pics as SelectedPics FROM " + rid + " LET $Pics = (SELECT expand(out('HAS_PROFILE_PICTURE')[0].out('HAS_FILE').include('format')) FROM $current)")
    .then(function (result) {
      result.results[0].content[0].value.SelectedPics.forEach(function(item){
        item.should.not.be.an.instanceof(LIB.RecordID);
      });
    })
  });
});