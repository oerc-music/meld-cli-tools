# Test container of annotations

# Create container

CONTAINER_URL=$(node meld_tool.js make-container /public/ test_annotation)
echo "Created container ${CONTAINER_URL}"

ANNOTATION_URL=$(node meld_tool.js add-annotation ${CONTAINER_URL} test-target test-body test-motivation)
echo "Created annotation ${ANNOTATION_URL}"

node meld_tool.js list-container /public/

node meld_tool.js list-container ${CONTAINER_URL}

node meld_tool.js show-resource ${ANNOTATION_URL}

ANNOTATION_URI=$(node meld_tool.js full-url ${ANNOTATION_URL})
echo "Full anotation URI is ${ANNOTATION_URI}"

node meld_tool.js test-text-resource ${ANNOTATION_URL} - <<EOF
    <> a oa:Annotation ;
        oa:hasTarget   <test-target> ;
        oa:hasBody     <test-body> ;
        oa:motivatedBy <test-motivation> .
EOF

node meld_tool.js --stdinurl="${ANNOTATION_URL}" \
                  test-rdf-resource ${ANNOTATION_URL} - <<EOF
    @prefix ldp: <http://www.w3.org/ns/ldp#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
    @prefix dc: <http://purl.org/dc/elements/> .
    @prefix dct: <http://purl.org/dc/terms/> .
    @prefix oa: <http://www.w3.org/ns/oa#> .
    @prefix mo: <http://purl.org/ontology/mo/> .
    @prefix frbr: <http://purl.org/vocab/frbr/core#> .
    @prefix nin: <http://numbersintonotes.net/terms#> .
    @prefix ninre: <http://remix.numbersintonotes.net/vocab#> .

    <> a oa:Annotation ;
      oa:hasTarget   <test-target> ;
      oa:hasBody     <test-body> ;
      oa:motivatedBy <test-motivation> .
EOF

# node meld_tool.js remove @@@@ annotation and container

# End.
