'use strict';
/* global before, after, CREATE_TEST_DB, DELETE_TEST_DB */

describe('Database API - Edge', function() {
  before(function() {
    var self = this;

    return CREATE_TEST_DB(self, 'testdb_dbapi_edge')
      .then(function() {
        return self.db.vertex.create([
          {
            name: 'vertex1'
          },
          {
            name: 'vertex2'
          },
          {
            name: 'vertex3'
          },
          {
            name: 'vertex4'
          }
        ]);
      })
      .reduce(function(list, item) {
        list[item.name] = item;
        return list;
      }, {})
      .then(function(vertices) {
        self.vertices = vertices;
      });
  });

  after(function() {
    return DELETE_TEST_DB('testdb_dbapi_edge');
  });

  describe('Db::edge.from().to().create()', function() {
    it('should create an edge between individual RIDs', function() {
      var self = this;

      return self.db.edge.from(self.vertices.vertex1['@rid']).to(self.vertices.vertex2['@rid']).create()
        .then(function(edges) {
          edges.length.should.equal(1);
          edges[0].out.should.eql(self.vertices.vertex1['@rid']);
          edges[0].in.should.eql(self.vertices.vertex2['@rid']);
          expect(edges[0]['@rid']).to.be.undefined;
        });
    });

    it('should create an edge between individual RIDs, with some content', function() {
      var self = this;

      return self.db.edge.from(self.vertices.vertex1['@rid']).to(self.vertices.vertex3['@rid']).create({
        key1: 'val1',
        key2: 'val2'
      })
        .then(function(edges) {
          edges.length.should.equal(1);
          edges[0].out.should.eql(self.vertices.vertex1['@rid']);
          edges[0].in.should.eql(self.vertices.vertex3['@rid']);
          expect(edges[0]['@rid']).to.not.be.undefined;
          edges[0].key1.should.eql('val1');
          edges[0].key2.should.eql('val2');
        });
    });

    it('should create an edge between lists of RIDs', function() {
      return this.db.edge.from("SELECT FROM OUser WHERE name = 'reader'").to("SELECT FROM ORole").create()
        .then(function(edges) {
          edges.length.should.be.above(0);
        });
    });
  });

  describe("Db::edge.from().to().delete()", function() {
    it('should delete an edge between individual RIDs', function() {
      return this.db.edge.from(this.vertices.vertex1['@rid']).to(this.vertices.vertex2['@rid']).delete()
        .then(function(count) {
          count.should.equal(1);
        });
    });
  });
});