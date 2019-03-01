# Test container of annotations

# Create container

CONTAINER_URL=$(node meld_tool.js create-workset /public/ test_annotation)
echo "Created container ${CONTAINER_URL}"

ANNOTATION_URL=$(node meld_tool.js add-annotation ${CONTAINER_URL} test-target test-body test-motivation)
echo "Created annotation ${ANNOTATION_URL}"

node meld_tool.js list-container /public/

node meld_tool.js list-container ${CONTAINER_URL}

node meld_tool.js show-resource ${ANNOTATION_URL}

node meld_tool.js test-text-resource ${ANNOTATION_URL} - <<EOF
    <> a oa:Annotation ;
      oa:hasTarget   <test-target> ;
      oa:hasBody     <test-body> ;
      oa:motivatedBy <test-motivation> .
EOF

# End.
