<?php

require __DIR__ . '/../vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;

$root = dirname(__DIR__, 2);
$source = $root . '/docs/panduan-stock-opname-material.html';
$target = $root . '/docs/panduan-stock-opname-material.pdf';

if (!is_file($source)) {
    fwrite(STDERR, "Source HTML not found: {$source}\n");
    exit(1);
}

$options = new Options();
$options->set('isRemoteEnabled', false);
$options->set('isHtml5ParserEnabled', true);
$options->set('defaultFont', 'DejaVu Sans');

$dompdf = new Dompdf($options);
$dompdf->loadHtml(file_get_contents($source), 'UTF-8');
$dompdf->setPaper('a4', 'portrait');
$dompdf->render();

file_put_contents($target, $dompdf->output());

echo $target . PHP_EOL;
