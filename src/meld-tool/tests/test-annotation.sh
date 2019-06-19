make_test_container

if [ $EXITSTATUS -eq 0 ]; then
    CONTAINER_PATH=$(node $MELD_TOOL make-annotation-container $TEST_PATH test_annotation_container)
    test_sts $? "make-annotation-container" \
      && test_eq "${CONTAINER_PATH}" "${TEST_PATH}test_annotation_container/" "make-annotation-container"
fi

if [ $EXITSTATUS -eq 0 ]; then
    PUBLIC_CONTENT=$(node $MELD_TOOL show-annotation-container $TEST_PATH)
    test_sts $? "show-annotation-container" \
      && test_in "$PUBLIC_CONTENT" "${CONTAINER_PATH}" "show-annotation-container"
fi

if [ $EXITSTATUS -eq 0 ]; then
    node $MELD_TOOL test-is-container ${CONTAINER_PATH}
    test_sts $? "test-is-container"
fi

if [ $EXITSTATUS -eq 0 ]; then
    CONTAINTER_CONTENT_TYPE=$(node $MELD_TOOL content-type ${CONTAINER_PATH})
    test_sts $? "show-content-type" \
      && test_eq "$CONTAINTER_CONTENT_TYPE" "text/turtle"
fi

# if [ $EXITSTATUS -eq 0 ]; then
#     node $MELD_TOOL show-resource-rdf ${CONTAINER_PATH}
#     test_sts $? "show-resource-rdf exit status"
#     EXITSTATUS=$?
# fi

cat >annotation-container-expect-content.tmp <<EOF
@prefix ldp: <http://www.w3.org/ns/ldp#>.
<${CONTAINER_PATH}>
    a ldp:BasicContainer, ldp:Container;
    .
EOF

if [ $EXITSTATUS -eq 0 ]; then
    node $MELD_TOOL \
        --stdinurl=https://localhost:8443/public/ \
        test-rdf-resource ${CONTAINER_PATH} - \
        <annotation-container-expect-content.tmp
    test_sts $? "container-content" \
      && test_eq "$CONTAINTER_CONTENT_TYPE" "text/turtle"
fi

rm annotation-container-expect-content.tmp

# If the client prefers to only receive the Container description and no Annotations (either URI or full descriptions) embedded in the Container response, then it must include a Prefer request header with the value 
# Prefer: return=representation;include="http://www.w3.org/ns/ldp#PreferMinimalContainer".

# If the client prefers to receive the Annotations only as IRI references, either embedded in the current Container response or future paged responses, then it must include a Prefer request header with the value 
# Prefer: return=representation;include="http://www.w3.org/ns/oa#PreferContainedIRIs".

# If the client prefers to receive complete Annotation descriptions, either in the current Container response or future paged responses, then it must include a Prefer request header with the value 
# Prefer: return=representation;include="http://www.w3.org/ns/oa#PreferContainedDescriptions".

# Make annotation 1

if [ $EXITSTATUS -eq 0 ]; then
    ANNOTATION1_URL=$(node $MELD_TOOL \
        make-annotation ${CONTAINER_PATH} \
        test-target1 annotation1/test-body1 test-motivation1)
    test_sts $? "make-annotation (1)" \
        && test_eq "${ANNOTATION1_URL}" "${TEST_PATH}test_annotation_container/test-target1.test-motivation1.test-body1.ttl"
    echo "Created annotation (1) ${ANNOTATION1_URL}"
fi

if [ $EXITSTATUS -eq 0 ]; then
    node $MELD_TOOL \
        test-is-annotation ${ANNOTATION1_URL}
    test_sts $? "test-is-annotation (1)"
    echo "Tested annotation (1) ${ANNOTATION1_URL}"
fi

# Show annotation 1

if [ $EXITSTATUS -eq 0 ]; then
    ANNOTATION1_CONTENT=$(node $MELD_TOOL show-annotation ${ANNOTATION1_URL})
    test_sts $? "show-annotation (1)" \
      && test_in "${ANNOTATION1_CONTENT}" "test-target1"     "show-annotation (1)" \
      && test_in "${ANNOTATION1_CONTENT}" "test-body1"       "show-annotation (1)" \
      && test_in "${ANNOTATION1_CONTENT}" "test-motivation1" "show-annotation (1)"
fi

# Make annotation 2

cat >annotation-body-content.tmp <<EOF
@prefix ldp: <http://www.w3.org/ns/ldp#>.
<https://localhost:8443/annotation2/body>
    <https://localhost:8443/annotation2/p1> <https://localhost:8443/annotation2/o1> ;
    <https://localhost:8443/annotation2/p2> <https://localhost:8443/annotation2/o2> ;
    .
EOF

if [ $EXITSTATUS -eq 0 ]; then
    ANNOTATION2_URL=$(node $MELD_TOOL \
        --body-inline --stdinurl=https://localhost:8443/annotation2/body \
        make-annotation ${CONTAINER_PATH} \
        test-target2 - test-motivation2 \
        < annotation-body-content.tmp)
    test_sts $? "make-annotation (2)" \
        && test_eq "${ANNOTATION2_URL}" "${TEST_PATH}test_annotation_container/test-target2.test-motivation2.body.ttl"
    echo "Created annotation (2) ${ANNOTATION2_URL}"
fi

rm annotation-body-content.tmp

if [ $EXITSTATUS -eq 0 ]; then
    node $MELD_TOOL \
        test-is-annotation ${ANNOTATION2_URL}
    test_sts $? "test-is-annotation (2)"
    echo "Tested annotation (2) ${ANNOTATION2_URL}"
fi

# Show annotation 2

cat >annotation2-expect-rdf.tmp <<EOF
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
        oa:hasTarget   <test-target2> ;
        oa:hasBody     <https://localhost:8443/annotation2/body> ;
        oa:motivatedBy <test-motivation2> ;
        .
    <https://localhost:8443/annotation2/body>
        <https://localhost:8443/annotation2/p1> <https://localhost:8443/annotation2/o1> ;
        <https://localhost:8443/annotation2/p2> <https://localhost:8443/annotation2/o2> ;
        .
EOF

if [ $EXITSTATUS -eq 0 ]; then
    node $MELD_TOOL --stdinurl="${ANNOTATION2_URL}#" \
        test-rdf-resource ${ANNOTATION2_URL} - \
        <annotation2-expect-rdf.tmp
    test_sts $? "test-rdf-annotation (2)"
fi

rm annotation2-expect-rdf.tmp

# List annotations

if [ $EXITSTATUS -eq 0 ]; then
    CONTAINER_CONTENT=$(node $MELD_TOOL show-annotation-container ${CONTAINER_PATH})
    test_sts $? "show-annotation-container" \
      && test_in "${CONTAINER_CONTENT}" "${ANNOTATION1_URL}" "show-annotation-container" \
      && test_in "${CONTAINER_CONTENT}" "${ANNOTATION2_URL}" "show-annotation-container"
fi


# return   #@@ Enable this to leave annotations for diagnostic examination

# Remove annotation

if [ $EXITSTATUS -eq 0 ]; then
    node $MELD_TOOL remove-annotation ${ANNOTATION1_URL}
    test_sts $?
fi

if [ $EXITSTATUS -eq 0 ]; then
    node $MELD_TOOL remove-annotation ${ANNOTATION2_URL}
    test_sts $?
fi

# List annotations

if [ $EXITSTATUS -eq 0 ]; then
    CONTAINER_CONTENT=$(node $MELD_TOOL show-annotation-container ${CONTAINER_PATH})
    test_sts $? "show-annotation-container" \
      && test_not_in "${CONTAINER_CONTENT}" "${ANNOTATION1_URL}" "show-annotation-container" \
      && test_not_in "${CONTAINER_CONTENT}" "${ANNOTATION2_URL}" "show-annotation-container"
fi

# Remove annotation container

if [ $EXITSTATUS -eq 0 ]; then
    node $MELD_TOOL remove-resource ${CONTAINER_PATH}
    test_sts $? "remove-resource (annotation container) exit status"
fi

return $EXITSTATUS
