import React from 'react';
import { Box, Container, Grid, Typography, Link } from '@mui/material';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) =>
          theme.palette.mode === 'light'
            ? theme.palette.grey[200]
            : theme.palette.grey[800],
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              UN Qoli Internal Tools
            </Typography>
            <Link href="#" color="text.secondary" display="block">
              link #
            </Link>
            <Link href="#" color="text.secondary" display="block">
              link #
            </Link>
            <Link href="#" color="text.secondary" display="block">
              link #
            </Link>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Links
            </Typography>
            <Link href="https://qolidemo.com" color="text.secondary" display="block">
              Dev Website - (qolidemo.com)
            </Link>
            <Link href="https://qolimpact.com" color="text.secondary" display="block">
              Prod Website - (qolimpact.com)
            </Link>
            <Link href="https://figma.com" color="text.secondary" display="block">
              Figma
            </Link>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Other projects
            </Typography>
            {['Connie', 'Linn', 'Salman', 'Anmol', 'Dipto', 'Ishu', 'Guru', 'Zac', 'May']
              .map((name) => (
                <Link
                  key={name}
                  href="#"
                  color="text.secondary"
                  display="block"
                >
                  {name}'s
                </Link>
              ))}
          </Grid>
        </Grid>
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ pt: 4 }}
        >
          Made with love in Kitchener © 2025 All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
